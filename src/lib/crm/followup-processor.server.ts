import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, getAiKey } from "@/lib/ai-gateway.server";
import { logger } from "../observability/logger.server";
import { AppError } from "../core/errors";
import { z } from "zod";

const FollowupStatus = z.enum([
  "PENDING",
  "READY",
  "PROCESSING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "CANCELED"
]);

type FollowupStatus = z.infer<typeof FollowupStatus>;

/**
 * Motor de Follow-up Consolidado (Fase 3 - Auditoria)
 */
export async function processPendingFollowups() {
  const traceId = `fup-proc-${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  const nowIso = now.toISOString();

  logger.info("FOLLOWUP_WORKER_STARTED", "Iniciando processamento de follow-ups", { traceId, now: nowIso });

  try {
    // 1. Buscar registros PENDING ou READY vencidos
    // Filtramos por scheduled_at <= now
    const { data: followups, error: fetchError } = await supabaseAdmin
      .from("crm_followups")
      .select("*")
      .in("status", ["PENDING", "READY", "PENDENTE"]) // Compatibilidade legada
      .lte("scheduled_at", nowIso)
      .lt("attempts", 3)
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (fetchError) {
      logger.error("FOLLOWUP_FETCH_FAILED", fetchError.message, { traceId, error: fetchError });
      return;
    }

    if (!followups || followups.length === 0) {
      logger.info("FOLLOWUP_WORKER_FINISHED", "Nenhum follow-up pendente encontrado", { traceId });
      return;
    }

    logger.info("FOLLOWUP_DETECTED", `Encontrados ${followups.length} follow-ups para processar`, { 
      traceId, 
      count: followups.length 
    });

    for (const followup of followups) {
      await processSingleFollowup(followup, traceId);
    }

    logger.info("FOLLOWUP_WORKER_FINISHED", "Processamento concluído", { traceId });
  } catch (err: any) {
    logger.critical("FOLLOWUP_WORKER_CRASH", err.message, { traceId, error: err });
  }
}

async function processSingleFollowup(followup: any, parentTraceId: string) {
  const traceId = `${parentTraceId}-${followup.id.split('-')[0]}`;
  
  try {
    // Marcar como PROCESSING imediatamente (Lock)
    const { error: lockError } = await supabaseAdmin
      .from("crm_followups")
      .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
      .eq("id", followup.id)
      .eq("status", followup.status); // Garantir que não mudou

    if (lockError) {
      logger.warn("FOLLOWUP_LOCKED", "Não foi possível travar o registro para processamento", { traceId, followupId: followup.id });
      return;
    }

    // 2. Elegibilidade e Bloqueios
    const { data: conversation } = await supabaseAdmin
      .from("wa_conversas")
      .select("instance, phone_number, status, attendance_mode, customer_context")
      .eq("phone", followup.phone)
      .maybeSingle();

    if (!conversation) {
      await blockFollowup(followup.id, "INVALID_PHONE", "Conversa não encontrada para este telefone", traceId);
      return;
    }

    // Bloqueio: Atendimento Humano Ativo
    if (conversation.attendance_mode === "human" || conversation.status === "atendido_humano") {
      await blockFollowup(followup.id, "HUMAN_ATTENDING", "Cliente em atendimento humano", traceId);
      return;
    }

    // Bloqueio: Cliente respondeu recentemente (dentro da janela do follow-up)
    // Se a última mensagem for do usuário e posterior à criação do follow-up
    const lastInteraction = conversation.customer_context?.last_interaction_at;
    if (lastInteraction && new Date(lastInteraction) > new Date(followup.created_at)) {
        await blockFollowup(followup.id, "CUSTOMER_REPLIED", "Cliente já interagiu após o agendamento do follow-up", traceId);
        return;
    }

    // Bloqueio: Motivo de Preço (Regra comercial específica)
    if (followup.reason === 'PRICE') {
      await blockFollowup(followup.id, "CONVERSATION_CLOSED", "Encerrado por objeção de preço", traceId);
      return;
    }

    logger.info("FOLLOWUP_ELIGIBLE", "Registro elegível para envio", { traceId, phone: followup.phone });

    // 3. Geração de IA
    logger.info("FOLLOWUP_GENERATION_STARTED", "Gerando mensagem com IA", { traceId });
    
    let messageText = followup.message_template;
    
    if (!messageText) {
      messageText = await generateAiFollowup(followup, conversation, traceId);
    }

    if (!messageText || messageText.trim().length === 0) {
      throw new Error("GENERATION_EMPTY_RESULT");
    }

    logger.info("FOLLOWUP_GENERATION_COMPLETED", "Mensagem gerada com sucesso", { traceId });

    // 4. Envio via Evolution
    logger.info("FOLLOWUP_SEND_STARTED", "Despachando para Evolution API", { traceId, instance: conversation.instance });
    
    const { sendEvolutionText } = await import("@/lib/evolution.server");
    const success = await sendEvolutionText(conversation.instance, conversation.phone_number, messageText);

    if (!success) {
      throw new Error("EVOLUTION_SEND_FAILED");
    }

    // 5. Registro e Finalização
    const now = new Date().toISOString();
    
    // Registrar na conversa para o operador ver
    await supabaseAdmin.rpc("append_wa_message" as any, {
      p_phone: followup.phone,
      p_message: {
          id: `fup-${Date.now()}`,
          role: 'assistant',
          parts: [{ type: 'text', text: messageText }],
          createdAt: now
      },
      p_instance: conversation.instance,
      p_phone_number: conversation.phone_number,
      p_increment_unread: false,
      p_new_status: "aguardando"
    });

    const newAttempts = (followup.attempts || 0) + 1;
    await supabaseAdmin
      .from("crm_followups")
      .update({
        status: "SENT",
        attempts: newAttempts,
        sent_at: now,
        completed_at: now,
        message_template: messageText,
        updated_at: now
      })
      .eq("id", followup.id);

    logger.info("FOLLOWUP_SEND_SUCCESS", "Follow-up enviado e registrado", { traceId, phone: followup.phone });

  } catch (err: any) {
    const isRetryable = ["EVOLUTION_SEND_FAILED", "IA_GENERATION_FAILED", "TIMEOUT"].includes(err.message);
    const newAttempts = (followup.attempts || 0) + 1;
    
    logger.error("FOLLOWUP_SEND_FAILED", err.message, { traceId, followupId: followup.id, retryable: isRetryable });

    await supabaseAdmin
      .from("crm_followups")
      .update({
        status: (isRetryable && newAttempts < 3) ? "READY" : "FAILED",
        attempts: newAttempts,
        metadata: { ...(followup.metadata || {}), last_error: err.message },
        updated_at: new Date().toISOString()
      })
      .eq("id", followup.id);
  }
}

async function blockFollowup(id: string, reasonCode: string, message: string, traceId: string) {
  logger.info("FOLLOWUP_BLOCKED", message, { traceId, followupId: id, reasonCode });
  await supabaseAdmin
    .from("crm_followups")
    .update({
      status: "CANCELED",
      cancelled_at: new Date().toISOString(),
      metadata: { blocker: reasonCode, blocker_message: message },
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
}

async function generateAiFollowup(followup: any, conversation: any, traceId: string): Promise<string> {
  const prompt = `
    Você é a Julia, recepcionista do Salão Seja Livre.
    Precisa enviar um follow-up humanizado para um cliente que parou o atendimento no estágio: ${followup.stage}.
    
    CONTEXTO DO CLIENTE:
    - Nome: ${conversation.contact_name || 'Cliente'}
    - Motivo do Abandono: ${followup.reason || 'Interesse em agendamento'}
    - Histórico: ${JSON.stringify(conversation.customer_context || {})}
    
    REGRAS:
    - NUNCA use mensagens genéricas ou robóticas.
    - Fale como uma pessoa real do salão.
    - Mencione o que foi conversado anteriormente de forma natural.
    - Não pressione por venda, apenas mostre que você está disponível para ajudar a finalizar o agendamento.
    - Máximo 2 parágrafos curtos.
    - Use emojis de forma sutil.
    - Idioma: Português do Brasil.
  `;

  try {
    const apiKey = await getAiKey();
    const provider = createLovableAiGatewayProvider(apiKey || "");
    const { text } = await generateText({
      model: provider("gemini-1.5-flash") as any,
      prompt,
    });
    return text;
  } catch (e: any) {
    logger.error("IA_GENERATION_FAILED", e.message, { traceId });
    throw new Error("IA_GENERATION_FAILED");
  }
}
