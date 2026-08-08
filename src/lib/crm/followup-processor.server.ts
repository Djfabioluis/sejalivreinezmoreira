import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { logger } from "../observability/logger.server";
import { ConversationService } from "../conversation-service.server";

// 2. COMPROVAR QUE ESTÁ EM EXECUÇÃO: WORKER_BOOT
logger.info("WORKER_BOOT", "Módulo FollowupProcessor carregado no runtime", {
  timestamp: new Date().toISOString(),
  runtime: typeof window === 'undefined' ? 'server' : 'client'
});

export async function processPendingFollowups() {
  const traceId = `fup-proc-${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  const nowIso = now.toISOString();
  const worker_id = "JuliaFollowupProcessorV5";

  logger.info("WORKER_STARTED", "Worker de processamento de follow-ups iniciado", { 
    traceId, 
    timestamp: nowIso,
    worker_id 
  });

  try {
    // NÃO DEIXAR READY INFINITO (Reset de jobs travados em PROCESSING)
    const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000).toISOString();
    await supabaseAdmin
      .from("crm_followups")
      .update({ 
        status: "READY", 
        updated_at: nowIso,
        metadata: { 
          recovery: "stuck_processing_timeout", 
          reset_at: nowIso,
          reason: "Processing stuck for more than 60s" 
        }
      } as any)
      .in("status", ["PROCESSING", "EM_PROCESSAMENTO"])
      .lt("updated_at", sixtySecondsAgo);

    const { data: followups, error: fetchError } = await (supabaseAdmin
      .from("crm_followups" as any) as any)
      .select("*")
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"])
      .lte("scheduled_at", nowIso)
      .lt("attempts", 3)
      .order("scheduled_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      logger.error("WORKER_FETCH_ERROR", fetchError.message, { traceId });
      return;
    }

    if (!followups || followups.length === 0) return;

    for (const followup of (followups as any[])) {
      await processSingleFollowup(followup, traceId);
    }
  } catch (err: any) {
    logger.critical("FOLLOWUP_WORKER_CRASH", err.message, { traceId, error: err });
  }
}

export async function processSingleFollowup(followup: any, parentTraceId: string) {
  const phone_last4 = followup.phone ? followup.phone.slice(-4) : "0000";
  const traceId = `${parentTraceId}-${followup.id.split('-')[0]}`;
  const worker_id = "JuliaFollowupProcessorV5";
  
  const logContext = {
    job_id: followup.id,
    rule_id: followup.rule_id,
    trace_id: traceId,
    phone_last4
  };

  try {
    const now = new Date().toISOString();
    
    // 1. FOLLOWUP_READY -> PROCESSING
    const { data: lockedJob, error: lockError } = await supabaseAdmin
      .from("crm_followups")
      .update({ 
        status: "PROCESSING", 
        updated_at: now,
        metadata: { 
          ...(followup.metadata || {}), 
          trace_id: traceId, 
          last_step: "FOLLOWUP_PROCESSING",
          started_at: now,
          worker_id,
          job_id: followup.id,
          phone_last4
        }
      } as any)
      .eq("id", followup.id)
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"])
      .select('id')
      .single();

    if (lockError || !lockedJob) {
      logger.warn("WORKER_JOB_GRAB_FAILED", "Worker não conseguiu travar o job", { ...logContext, reason: "Race condition or status change" });
      return;
    }

    logger.info("FOLLOWUP_PROCESSING", "Iniciando processamento do job", logContext);

    // 1.5 Filtro de Testes Manuais (Tratar isoladamente ou descartar)
    if (followup.reason === "MANUAL_TEST" || followup.stage === "TEST_EXECUTION") {
      logger.info("FOLLOWUP_TEST_BYPASS", "Job de teste manual detectado. Cancelando sem envio real.", logContext);
      await blockFollowup(followup.id, "TEST_SKIPPED", "Manual test job ignored by processor", traceId, logContext);
      return;
    }

    // 2. Verificação de Duplicidade / Envio Prévio (Idempotência)
    const { data: previousSent } = await supabaseAdmin
      .from("crm_followups")
      .select("id, status, message_id, sent_at")
      .eq("phone", followup.phone)
      .eq("status", "SENT")
      .neq("id", followup.id)
      .maybeSingle();

    if (previousSent) {
      const cancelReason = "CANCELED_ALREADY_SENT";
      logger.info("FOLLOWUP_CANCELED_ALREADY_SENT", "Job cancelado pois já houve envio anterior para este telefone", {
        ...logContext,
        original_job_id: previousSent.id,
        original_message_id: previousSent.message_id,
        original_sent_at: previousSent.sent_at
      });

      await supabaseAdmin.from("crm_followups").update({
        status: "CANCELED",
        cancel_reason: cancelReason,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(followup.metadata || {}),
          ...logContext,
          original_job_id: previousSent.id,
          original_message_id: previousSent.message_id,
          original_sent_at: previousSent.sent_at,
          cancel_code: cancelReason
        }
      } as any).eq("id", followup.id);
      return;
    }

    // 3. Normalização do Telefone
    const { normalizeBrazilianPhone } = await import("@/lib/phone");
    const normalized = normalizeBrazilianPhone(followup.phone);
    
    if (!normalized || normalized.reason) {
      await blockFollowup(followup.id, "INVALID_PHONE", `Telefone inválido: ${normalized?.reason || "FORMAT_NOT_RECOGNIZED"}`, traceId, logContext);
      return;
    }

    // 4. Busca ou Criação de Conversa (Priorizando Telefone se customer_id for null)
    const instance = followup.metadata?.instance || "agente-5541998430354";
    let conversation: any;
    
    try {
      // Tentar encontrar conversa existente por phone_number (mais confiável)
      const existingConv = await ConversationService.findByPhone(instance, normalized.full);
      
      if (existingConv) {
        conversation = existingConv;
      } else {
        // Se não encontrar por telefone, criar nova
        conversation = await ConversationService.findOrCreate({
          instance,
          phone_number: normalized.full,
          contact_name: followup.metadata?.contact_name || 'Cliente',
          metadata: logContext
        });
      }
      
      logger.info("FOLLOWUP_CONVERSATION_RESOLVED", "Conversa resolvida", {
        ...logContext,
        conversation_id: conversation.id,
        found_by: existingConv ? "phone_lookup" : "creation"
      });
    } catch (convErr: any) {
      const errorInfo = {
        stage: "CONVERSATION_LOOKUP",
        message: convErr.message,
        name: convErr.name,
        stack: convErr.stack,
        timestamp: new Date().toISOString()
      };
      await blockFollowup(followup.id, "CONVERSATION_CREATION_FAILED", `Erro ao resolver conversa: ${convErr.message}`, traceId, { ...logContext, last_error: errorInfo });
      return;
    }

    const ctx = (conversation.customer_context as any) || {};
    const attendanceMode = ctx.attendance_mode || (conversation as any).attendance_mode;
    
    if (attendanceMode === "human" || conversation.status === "atendido_humano") {
      await blockFollowup(followup.id, "HUMAN_TAKEOVER", "Cliente em atendimento humano", traceId, logContext);
      return;
    }

    // 5. Resolução de Nome e Geração de Mensagem
    const nameData = await resolveFollowupCustomerName(followup, conversation, traceId);
    
    let messageText = followup.message_template;
    if (!messageText) {
       messageText = await generateAiFollowup(followup, nameData);
    } else {
      if (nameData.firstName) {
        messageText = messageText.replace(/{{nome}}/g, nameData.fullName || "");
        messageText = messageText.replace(/{{primeiro_nome}}/g, nameData.firstName || "");
      } else {
        messageText = messageText.replace(/,?\s?{{nome}}/g, "");
        messageText = messageText.replace(/,?\s?{{primeiro_nome}}/g, "");
      }
    }

    logger.info("FOLLOWUP_MESSAGE_GENERATED", "Mensagem gerada", {
      ...logContext,
      messageText
    });

    if (!messageText) {
      throw new Error("MESSAGE_GENERATION_FAILED");
    }

    // 6. Envio via Evolution API
    logger.info("FOLLOWUP_EVOLUTION_STARTED", "Iniciando envio via Evolution", logContext);
    
    const { sendEvolutionText } = await import("@/lib/evolution.server");
    const evoResult = await sendEvolutionText(instance, conversation.phone_number, messageText);
    const success = evoResult.success;
    const evolutionData = evoResult.data;
    const messageId = evolutionData?.key?.id || evolutionData?.id || evolutionData?.message?.key?.id;

    if (!success) {
      const evolutionError = {
        stage: "EVOLUTION_SEND",
        provider: "evolution-api",
        endpoint: "sendText",
        status: evolutionData?.status || 400,
        error_code: evolutionData?.code || "EVOLUTION_HTTP_ERROR",
        message: evolutionData?.message || "Erro desconhecido na Evolution API",
        response_body: evolutionData,
        request_id: messageId || 'N/A',
        timestamp: new Date().toISOString()
      };
      throw { type: "EVOLUTION_SEND_FAILED", message: `Evolution error: ${evolutionError.message}`, details: evolutionError };
    }

    logger.info("FOLLOWUP_EVOLUTION_SUCCESS", "Mensagem aceita pela Evolution API", { 
      ...logContext, 
      message_id: messageId 
    });

    // 7. Ponto de não-retorno: A partir daqui o status é SENT
    const completionTime = new Date().toISOString();
    
    // Tentamos atualizar o histórico e o job. Se falhar, logamos mas o status lógico é SENT.
    try {
      await (supabaseAdmin.rpc("append_wa_message" as any, {
        p_phone: followup.phone,
        p_message: { 
          id: messageId || `fup-${Date.now()}`, 
          role: 'assistant', 
          parts: [{ type: 'text', text: messageText }], 
          createdAt: completionTime 
        },
        p_instance: conversation.instance,
        p_phone_number: conversation.phone_number,
        p_increment_unread: false,
        p_new_status: "aguardando"
      } as any) as any);
    } catch (auditErr: any) {
      logger.warn("AUDIT_SAVE_FAILED", "Falha ao salvar log de conversa, mas envio foi feito", { ...logContext, error: auditErr.message });
    }

    const updatePayload = {
      status: "SENT",
      attempts: (followup.attempts || 0) + 1,
      sent_at: completionTime,
      completed_at: completionTime,
      message_template: messageText,
      message_id: messageId,
      updated_at: completionTime,
      metadata: {
        ...(followup.metadata || {}),
        ...logContext,
        conversationId: conversation.id,
        evolution_response: evolutionData,
        finished_at: completionTime
      }
    };

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("crm_followups")
      .update(updatePayload as any)
      .eq("id", followup.id)
      .select('*');

    if (updateError || !updateData?.length) {
      // Se chegamos aqui, a mensagem FOI ENVIADA, mas o banco falhou no update final
      logger.critical("POST_SEND_DB_UPDATE_FAILED", "Mensagem enviada via Evolution mas falhou ao atualizar crm_followups", {
        ...logContext,
        message_id: messageId,
        error: updateError?.message
      });
      // Não lançamos erro aqui para evitar o catch que mudaria o status para FAILED
    } else {
      logger.info("FOLLOWUP_SENT", "Job finalizado com sucesso", {
        ...logContext,
        message_id: messageId
      });
    }

  } catch (err: any) {
    // FAILED só pode ocorrer ANTES do envio bem-sucedido via Evolution
    const errorDetails = err.details || { 
      message: err.message, 
      name: err.name,
      stack: err.stack,
      timestamp: new Date().toISOString() 
    };

    logger.error("FOLLOWUP_ERROR", err.message, { ...logContext, error: errorDetails });

    await supabaseAdmin.from("crm_followups").update({
      status: "FAILED",
      updated_at: new Date().toISOString(),
      metadata: {
        ...(followup.metadata || {}),
        ...logContext,
        last_error: errorDetails
      }
    } as any).eq("id", followup.id);
  }
}

async function blockFollowup(id: string, reason: string, detail: string, traceId: string, logContext: any = {}) {
  logger.info("FOLLOWUP_CANCELED", detail, { ...logContext, cancel_reason: reason });
  await supabaseAdmin.from("crm_followups").update({
    status: "CANCELED",
    cancel_reason: reason,
    updated_at: new Date().toISOString(),
    metadata: {
      trace_id: traceId,
      cancel_detail: detail,
      ...logContext
    }
  } as any).eq("id", id);
}

async function resolveFollowupCustomerName(followup: any, conversation: any, traceId: string) {
  const fullName = followup.metadata?.contact_name || conversation.contact_name || "Cliente";
  const firstName = fullName !== "Cliente" ? fullName.split(' ')[0] : null;
  return { fullName, firstName, source: "metadata" };
}

async function generateAiFollowup(followup: any, nameData: any) {
  const providerName = "google";
  const modelName = "gemini-1.5-flash";
  const startTime = Date.now();
  
  try {
    const { getAiKey } = await import("../ai-gateway.server");
    const apiKey = await getAiKey();
    
    if (!apiKey) {
      throw new Error("LOVABLE_AI_GATEWAY_KEY not found in environment");
    }

    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const provider = createGoogleGenerativeAI({
      apiKey,
      baseURL: "https://ai.gateway.lovable.dev/v1/google",
      headers: {
        "Lovable-API-Key": apiKey,
      }
    });
    
    const model = provider(modelName);
    const prompt = `Aja como Julia, uma assistente humanizada de um salão de beleza. O cliente se chama ${nameData.fullName} (primeiro nome: ${nameData.firstName || 'cliente'}). Gere uma mensagem curta, acolhedora e personalizada de follow-up para este cliente. Nunca use a palavra "Cliente" como se fosse o nome dele.`;
    
    const { text } = await generateText({
      model,
      prompt,
    });
    
    return text;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const errorInfo = {
      stage: "AI_GENERATION",
      provider: providerName,
      model: modelName,
      endpoint: "lovable-ai-gateway",
      http_status: err.status || err.statusCode || (err.response?.status),
      error_code: err.name || "AI_ERROR",
      message: err.message,
      response_body: err.response?.data || err.data || null,
      request_id: err.headers?.['x-request-id'] || err.response?.headers?.['x-request-id'],
      duration_ms: duration,
      stacktrace: err.stack,
      timestamp: new Date().toISOString()
    };

    throw { 
      type: "AI_GENERATION_FAILED", 
      message: err.message, 
      details: errorInfo 
    };
  }
}
