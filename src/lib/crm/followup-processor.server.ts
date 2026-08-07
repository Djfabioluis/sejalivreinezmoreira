import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, getAiKey } from "@/lib/ai-gateway.server";
import { logger } from "../observability/logger.server";

/**
 * Interface para regras de follow-up
 */
interface FollowupRule {
  id: string;
  name: string;
  type: string;
  delay_amount: number;
  delay_unit: 'MINUTES' | 'HOURS' | 'DAYS';
  message_mode: 'AI' | 'FIXED';
  fixed_message?: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
  unit_id?: string;
  agent_id?: string;
}

/**
 * Motor de Follow-up Consolidado (Fase 3 - Auditoria)
 */
export async function processPendingFollowups() {
  const traceId = `fup-proc-${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  const nowIso = now.toISOString();

  logger.info("FOLLOWUP_WORKER_STARTED", "Iniciando processamento de follow-ups", { traceId, now: nowIso });

  try {
    // 1. Verificar se existem novas regras para criar follow-ups (Detector de elegibilidade)
    await discoverNewFollowups(traceId);

    // 2. Recuperação de registros presos em PROCESSING (Step 19)
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const { data: stuck } = await supabaseAdmin
      .from("crm_followups")
      .update({ 
        status: "READY", 
        updated_at: nowIso,
        metadata: { recovery: "stuck_processing_reset", reset_at: nowIso }
      })
      .in("status", ["PROCESSING", "EM_PROCESSAMENTO"])
      .lt("updated_at", fifteenMinsAgo)
      .select();

    if (stuck && stuck.length > 0) {
      logger.warn("FOLLOWUP_STUCK_RECOVERED", `Recuperados ${stuck.length} registros presos`, { traceId });
    }

    // 3. Buscar registros PENDING ou READY vencidos
    const { data: followups, error: fetchError } = await (supabaseAdmin
      .from("crm_followups" as any) as any)
      .select("*")
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"])
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
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"]);

    if (lockError) {
      logger.warn("FOLLOWUP_LOCKED", "Não foi possível travar o registro para processamento", { traceId, followupId: followup.id });
      return;
    }

    // 2. Elegibilidade e Bloqueios
    const { data: conversation } = await (supabaseAdmin
      .from("wa_conversas" as any) as any)
      .select("*")
      .eq("phone", followup.phone)
      .maybeSingle();

    if (!conversation) {
      await blockFollowup(followup.id, "INVALID_PHONE", "Conversa não encontrada para este telefone", traceId);
      return;
    }

    const ctx = (conversation.customer_context as any) || {};
    const attendanceMode = ctx.attendance_mode || (conversation as any).attendance_mode;
    
    if (attendanceMode === "human" || conversation.status === "atendido_humano") {
      await blockFollowup(followup.id, "HUMAN_ATTENDING", "Cliente em atendimento humano", traceId);
      return;
    }

    const lastInteraction = ctx.last_interaction_at;
    if (lastInteraction && new Date(lastInteraction) > new Date(followup.created_at)) {
        await blockFollowup(followup.id, "CUSTOMER_REPLIED", "Cliente já interagiu após o agendamento do follow-up", traceId);
        return;
    }

    logger.info("FOLLOWUP_ELIGIBLE", "Registro elegível para envio", { traceId, phone: followup.phone });

    // 3. Geração de Mensagem
    let messageText = followup.message_template;
    
    if (!messageText) {
      if (followup.reason?.toString().trim().toUpperCase() === 'DEBUG_AUDIT') {
        messageText = "Teste técnico de follow-up - Julia AI";
      } else {
        messageText = await generateAiFollowup(followup, conversation, traceId);
      }
    }

    if (!messageText || messageText.trim().length === 0) {
      throw new Error("IA_GENERATION_FAILED");
    }

    // 4. Envio via Evolution
    const instance = conversation.instance;
    const phoneNumber = conversation.phone_number;

    if (!instance || !phoneNumber) {
      await blockFollowup(followup.id, "MISSING_INSTANCE", "Dados de instância ou número ausentes", traceId);
      return;
    }

    const { sendEvolutionText } = await import("@/lib/evolution.server");
    const success = await sendEvolutionText(instance, phoneNumber, messageText);

    if (!success) {
      throw new Error("EVOLUTION_SEND_FAILED");
    }

    // 5. Registro e Finalização
    const now = new Date().toISOString();
    
    await (supabaseAdmin.rpc("append_wa_message" as any, {
      p_phone: followup.phone,
      p_message: {
          id: `fup-${Date.now()}`,
          role: 'assistant',
          parts: [{ type: 'text', text: messageText }],
          createdAt: now
      },
      p_instance: instance,
      p_phone_number: phoneNumber,
      p_increment_unread: false,
      p_new_status: "aguardando"
    } as any) as any);

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
    const nextStatus = (isRetryable && newAttempts < 3) ? "READY" : "FAILED";

    await supabaseAdmin
      .from("crm_followups")
      .update({
        status: nextStatus,
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
    Enviar um follow-up humanizado para um cliente que parou o atendimento no estágio: ${followup.stage}.
    Nome: ${conversation.contact_name || 'Cliente'}
    Motivo: ${followup.reason || 'Interesse em agendamento'}
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

async function discoverNewFollowups(traceId: string) {
  const { data: rules } = await (supabaseAdmin
    .from("crm_followup_rules" as any) as any)
    .select("*")
    .eq("enabled", true);

  if (!rules) return;

  for (const rule of rules as FollowupRule[]) {
    if (rule.type === 'ABANDONMENT') {
       await handleAbandonmentRule(rule, traceId);
    }
  }
}

async function handleAbandonmentRule(rule: FollowupRule, traceId: string) {
  const now = new Date();
  let delayMs = rule.delay_amount * 60 * 1000;
  if (rule.delay_unit === 'HOURS') delayMs *= 60;
  if (rule.delay_unit === 'DAYS') delayMs *= 24;

  const threshold = new Date(now.getTime() - delayMs).toISOString();

  const { data: abandoned } = await (supabaseAdmin
    .from("wa_conversas" as any) as any)
    .select("phone, customer_context, last_interaction_at")
    .not("status", "in", '("atendido_humano", "finalizado")')
    .lt("last_interaction_at", threshold)
    .limit(50);

  if (!abandoned) return;

  for (const conv of (abandoned as any[])) {
    const { data: existing } = await supabaseAdmin
      .from("crm_followups")
      .select("id")
      .eq("phone", conv.phone)
      .eq("rule_id", rule.id)
      .maybeSingle();

    if (existing) continue;

    await (supabaseAdmin.from("crm_followups" as any) as any).insert({
      phone: conv.phone,
      stage: (conv.customer_context as any)?.current_stage || 'ABANDONADO',
      reason: 'ABANDONMENT_RULE',
      scheduled_at: now.toISOString(),
      status: 'PENDING',
      rule_id: rule.id,
      message_template: rule.message_mode === 'FIXED' ? rule.fixed_message : null,
      metadata: { traceId, rule_name: rule.name }
    } as any);
  }
}
