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
    // Limite de 5 minutos para considerar travado
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { count: resetCount } = await supabaseAdmin
      .from("crm_followups")
      .update({ 
        status: "READY", 
        updated_at: nowIso,
        metadata: { 
          ...(typeof now === 'object' ? {} : {}), // Placeholder to maintain metadata structure
          recovery: "stuck_processing_timeout", 
          reset_at: nowIso,
          reason: "Processing stuck for more than 5m" 
        }
      } as any)
      .in("status", ["PROCESSING", "EM_PROCESSAMENTO"])
      .lt("updated_at", fiveMinutesAgo);

    if (resetCount && resetCount > 0) {
      logger.info("WORKER_AUTO_RECOVERY", `${resetCount} jobs recuperados de PROCESSING para READY`, { traceId });
    }

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
  if (!followup?.id) {
    logger.warn("WORKER_EMPTY_JOB", "Worker recebeu um job inválido ou sem ID");
    return;
  }

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
          ...(typeof followup.metadata === 'object' ? followup.metadata : {}), 
          trace_id: traceId, 
          last_step: "FOLLOWUP_PROCESSING",
          started_at: now,
          worker_id,
          job_id: followup.id,
          phone_last4
        }
      } as any)
      .eq("id", followup.id)
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND", "PROCESSING", "FAILED", "CANCELED"])
      .select('*')
      .single();

    if (lockError || !lockedJob) {
      // Se não conseguimos travar, mas o job já existe, podemos tentar processar o objeto atual 
      // ou apenas registrar o log. Para fins de robustez, mantemos o retorno aqui.
      logger.warn("WORKER_JOB_GRAB_FAILED", "Worker não conseguiu travar o job", { ...logContext, reason: lockError?.message || "Job not found or status mismatch" });
      return;
    }

    const currentFollowup = lockedJob;
    logger.info("FOLLOWUP_PROCESSING", "Iniciando processamento do job", logContext);

    // 1.5 Filtro de Testes Sintéticos (Baseado exclusivamente em campos estruturados)
    const isSyntheticTest = currentFollowup.reason === "MANUAL_TEST" || currentFollowup.stage === "TEST_EXECUTION";

    if (isSyntheticTest) {
      logger.info("FOLLOWUP_TEST_BYPASS", "Job de teste sintético detectado. Cancelando sem envio real.", logContext);
      await blockFollowup(currentFollowup.id, "TEST_SKIPPED", "Synthetic test job ignored by processor", traceId, logContext);
      return;
    }

    // 2. Verificação de Duplicidade / Envio Prévio (Idempotência)
    const { data: previousSent } = await supabaseAdmin
      .from("crm_followups")
      .select("id, status, message_id, sent_at")
      .eq("phone", currentFollowup.phone)
      .eq("status", "SENT")
      .neq("id", currentFollowup.id)
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
          ...(typeof currentFollowup.metadata === 'object' ? currentFollowup.metadata : {}),
          ...logContext,
          original_job_id: previousSent.id,
          original_message_id: previousSent.message_id,
          original_sent_at: previousSent.sent_at,
          cancel_code: cancelReason
        }
      } as any).eq("id", currentFollowup.id);
      return;
    }
    
    // 3. Normalização do Telefone
    const { normalizeBrazilianPhone } = await import("@/lib/phone");
    const normalized = normalizeBrazilianPhone(currentFollowup.phone);
    
    if (!normalized || normalized.reason) {
      await blockFollowup(currentFollowup.id, "INVALID_PHONE", `Telefone inválido: ${normalized?.reason || "FORMAT_NOT_RECOGNIZED"}`, traceId, logContext);
      return;
    }

    // 4. Busca de Conversa Unificada
    const followupMetadata = typeof currentFollowup.metadata === 'object' ? (currentFollowup.metadata as any) : {};
    const { resolveConversationForFollowup } = await import("./conversation-resolver.server");
    const resolution = await resolveConversationForFollowup(currentFollowup.phone, followupMetadata, traceId);
    
    let conversation: any = resolution.conversation;
    const instance = resolution.instance;

    if (conversation) {
      logger.info("FOLLOWUP_CONVERSATION_RESOLVED", "Conversa resolvida com sucesso", {
        ...logContext,
        conversation_id: conversation.id || conversation.phone,
        found_by: resolution.foundBy
      });
    } else {
      logger.info("FOLLOWUP_CONVERSATION_NOT_FOUND", "Nenhuma conversa existente para este telefone. O envio continuará sem vínculo de conversa.", {
        ...logContext,
        phone: resolution.normalizedPhone,
        found_by: resolution.foundBy
      });
      
      // Objeto de conversa mínima para o pipeline
      conversation = {
        phone_number: resolution.normalizedPhone,
        instance: instance,
        id: null,
        contact_name: null,
        attendance_mode: 'AI'
      };
    }


    const ctx = (conversation.customer_context as any) || {};
    const attendanceMode = ctx.attendance_mode || (conversation as any).attendance_mode;
    
    if (attendanceMode === "human" || conversation.status === "atendido_humano") {
      await blockFollowup(currentFollowup.id, "HUMAN_TAKEOVER", "Cliente em atendimento humano", traceId, logContext);
      return;
    }

    // 5. Resolução de Nome e Geração de Mensagem
    const nameData = await resolveFollowupCustomerName(currentFollowup, conversation, traceId);
    
    let messageText = currentFollowup.message_template;
    if (!messageText) {
       messageText = await generateAiFollowup(currentFollowup, nameData);
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
    const targetInstance = conversation.instance || instance;
    const evoResult = await sendEvolutionText(targetInstance, conversation.phone_number, messageText);
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
        p_phone: currentFollowup.phone,
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
      attempts: (currentFollowup.attempts || 0) + 1,
      sent_at: completionTime,
      completed_at: completionTime,
      message_template: messageText,
      message_id: messageId,
      updated_at: completionTime,
      metadata: {
        ...(typeof currentFollowup.metadata === 'object' ? currentFollowup.metadata : {}),
        ...logContext,
        conversation_id: conversation.id || conversation.phone || null,
        ...nameData.auditData,

        evolution_response: evolutionData,
        finished_at: completionTime
      }
    };

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("crm_followups")
      .update(updatePayload as any)
      .eq("id", currentFollowup.id)
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
        ...(typeof followup?.metadata === 'object' ? followup.metadata : {}),
        ...logContext,
        last_error: errorDetails
      }
    } as any).eq("id", followup?.id || logContext.job_id);
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
  const { isValidCustomerName, formatCustomerName } = await import("./customer-name-validator");
  const { normalizeBrazilianPhone } = await import("@/lib/phone");

  let resolvedName: string | null = null;
  let source: string | null = null;
  
  const followupMetadata = typeof followup.metadata === 'object' ? (followup.metadata as any) : {};
  const phone = followup.phone;
  const normalizedPhone = normalizeBrazilianPhone(phone)?.full;

  // Hierarquia de busca
  // 1. Cadastro principal do CRM (crm_customer_pipeline)
  if (!resolvedName && phone) {
    const { data } = await supabaseAdmin
      .from("crm_customer_pipeline")
      .select("customer_name")
      .eq("phone", phone)
      .maybeSingle();
    
    if (data?.customer_name && isValidCustomerName(data.customer_name)) {
      resolvedName = data.customer_name;
      source = "crm_customer_pipeline";
    }
  }

  // 2. Conversa vinculada (pushName/contact_name)
  if (!resolvedName && conversation?.contact_name && isValidCustomerName(conversation.contact_name)) {
    resolvedName = conversation.contact_name;
    source = "wa_conversas";
  }

  // 3. Metadata da conversa
  if (!resolvedName && conversation?.customer_context?.pushName && isValidCustomerName(conversation.customer_context.pushName)) {
    resolvedName = conversation.customer_context.pushName;
    source = "wa_conversas_metadata";
  }

  // 4. Metadata do follow-up (legado/fallback)
  if (!resolvedName && followupMetadata?.contact_name && isValidCustomerName(followupMetadata.contact_name)) {
    resolvedName = followupMetadata.contact_name;
    source = "followup_metadata";
  }

  const finalName = resolvedName ? formatCustomerName(resolvedName) : null;
  const firstName = finalName ? finalName.split(' ')[0] : null;

  const auditData = {
    customer_name_resolved: finalName,
    customer_name_source: source,
    customer_name_valid: !!finalName,
    customer_name_fallback_used: !finalName
  };

  if (finalName) {
    logger.info("FOLLOWUP_NAME_RESOLVED", `Nome resolvido: ${finalName}`, { ...auditData, traceId });
  } else {
    logger.info("FOLLOWUP_NAME_NOT_FOUND", "Nenhum nome válido encontrado", { ...auditData, traceId });
  }

  return { 
    fullName: finalName, 
    firstName, 
    source,
    auditData
  };
}

async function generateAiFollowup(followup: any, nameData: any) {
    const providerName = "lovable";
    const modelName = "gemini-1.5-flash"; 

  const startTime = Date.now();
  
  try {
    // createLovableAiGatewayProvider já está importado no topo
    const apiKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY || "";
    
    if (!apiKey) {
      throw new Error("API KEY not found in environment (LOVABLE_AI_GATEWAY_KEY or LOVABLE_API_KEY)");
    }


    const namePrompt = nameData.fullName 
      ? `O cliente se chama ${nameData.fullName} (primeiro nome: ${nameData.firstName}). Use saudação personalizada: "Olá, ${nameData.firstName}!".`
      : `Não sabemos o nome do cliente. NUNCA invente um nome. Use uma saudação natural sem nome, como: "Olá! Tudo bem?" ou "Oi! Como vai?".`;

    const prompt = `Aja como Julia, uma assistente humanizada de um salão de beleza. 
${namePrompt}
Gere uma mensagem curta, acolhedora e personalizada de follow-up para este cliente. 
INSTRUÇÕES CRÍTICAS: 
- Nunca use a palavra "Cliente", "Usuario", "Usuário" ou similares como nome.
- Se o nome do cliente for null ou inválido, use exclusivamente saudação natural sem nome.
- Mantenha o tom profissional e caloroso.`;


    
    // Fallback para fetch direto se o provider estiver dando 400
    console.log("Julia AI: Chamando Gateway Lovable (fetch direto)...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch-raw"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });



    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw { status: response.status, data: errorBody };
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "";

  } catch (err: any) {
    const duration = Date.now() - startTime;
    const errorInfo = {
      stage: "AI_GENERATION",
      provider: providerName,
      model: modelName,
      endpoint: "lovable-ai-gateway-raw",
      http_status: err.status || 500,
      error_code: "AI_RAW_ERROR",
      message: err.message || "Failed to generate AI response",
      response_body: err.data || null,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    };

    throw { 
      type: "AI_GENERATION_FAILED", 
      message: errorInfo.message, 
      details: errorInfo 
    };
  }
}
