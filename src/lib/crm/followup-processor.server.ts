import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, getAiKey } from "@/lib/ai-gateway.server";
import { logger } from "../observability/logger.server";
import { ConversationService } from "../conversation-service.server";
import { BempService } from "../bemp-service.server";

// 2. COMPROVAR QUE ESTÁ EM EXECUÇÃO: WORKER_BOOT
logger.info("WORKER_BOOT", "Módulo FollowupProcessor carregado no runtime", {
  timestamp: new Date().toISOString(),
  runtime: typeof window === 'undefined' ? 'server' : 'client'
});


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
}

export async function processPendingFollowups() {
  const traceId = `fup-proc-${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  const nowIso = now.toISOString();
  const worker_id = "JuliaFollowupProcessorV4";

  // 6. LOG OBRIGATÓRIO: WORKER_STARTED
  logger.info("WORKER_STARTED", "Worker de processamento de follow-ups iniciado", { 
    traceId, 
    timestamp: nowIso,
    worker_id 
  });

  try {
    // 6. LOG OBRIGATÓRIO: WORKER_TICK
    logger.info("WORKER_TICK", "Ciclo de processamento iniciado", { 
      traceId, 
      timestamp: nowIso,
      worker_id 
    });

    await discoverNewFollowups(traceId);

    // 7. NÃO DEIXAR READY INFINITO (Reset de jobs travados em PROCESSING)
    const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000).toISOString();
    const { count: resetCount } = await supabaseAdmin
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
      .lt("updated_at", sixtySecondsAgo)
      .select('id');

    if (resetCount && resetCount > 0) {
      logger.info("WORKER_STUCK_RESET", `${resetCount} jobs redefinidos por timeout de processamento`, { traceId });
    }

    // 3. REGISTRAR QUANTOS JOBS EXISTEM
    const { data: stats, error: statsError } = await supabaseAdmin
      .from("crm_followups")
      .select("status");

    if (!statsError && stats) {
      const ready = stats.filter(s => s.status && ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"].includes(s.status)).length;
      const processing = stats.filter(s => s.status && ["PROCESSING", "EM_PROCESSAMENTO"].includes(s.status)).length;
      const waiting = stats.filter(s => s.status && ["WAITING", "AGUARDANDO"].includes(s.status)).length;
      
      logger.info("QUEUE_SCANNED", `Status da fila mapeado`, { 
        traceId, 
        ready, 
        processing, 
        waiting,
        timestamp: nowIso 
      });
    }

    // 2. MOSTRAR A CONSULTA / BUSCA DE JOBS
    // Filtros: status IN [...], scheduled_at <= NOW, attempts < 3
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

    if (!followups || followups.length === 0) {
      // 5. SE NENHUM JOB FOR ESCOLHIDO
      logger.info("WORKER_IDLE", "Nenhum followup qualificado pelos filtros (status, scheduled_at, attempts)", { 
        traceId,
        filters: {
          status: ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"],
          max_scheduled_at: nowIso,
          max_attempts: 3
        }
      });
      return;
    }

    for (const followup of (followups as any[])) {
      // 4. REGISTRAR O JOB ESCOLHIDO & 6. JOB_SELECTED
      logger.info("JOB_SELECTED", `Job selecionado para processamento`, { 
        traceId, 
        job_id: followup.id,
        rule_id: followup.rule_id,
        telefone: followup.phone,
        created_at: followup.created_at,
        worker_id,
        timestamp: new Date().toISOString()
      });
      await processSingleFollowup(followup, traceId);
    }
  } catch (err: any) {
    logger.critical("FOLLOWUP_WORKER_CRASH", err.message, { traceId, error: err });
  }
}

export async function processSingleFollowup(followup: any, parentTraceId: string) {
  const traceId = `${parentTraceId}-${followup.id.split('-')[0]}`;
  const worker_id = "JuliaFollowupProcessorV3";
  
  try {
    const now = new Date().toISOString();
    // 6. LOG OBRIGATÓRIO: JOB_STARTED (via JOB_LOCKED)
    const { data: lockedJob, error: lockError } = await supabaseAdmin
      .from("crm_followups")
      .update({ 
        status: "PROCESSING", 
        updated_at: now,
        metadata: { 
          ...(followup.metadata || {}), 
          traceId, 
          last_step: "FOLLOWUP_PROCESSING",
          started_at: now,
          worker_id
        }
      } as any)
      .eq("id", followup.id)
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"])
      .select('id')
      .single();

    if (lockError || !lockedJob) {
      const reason = lockError ? `Database error: ${lockError.message}` : "Race condition: job already taken or status changed";
      logger.warn("WORKER_JOB_GRAB_FAILED", `Worker não conseguiu travar o job ${followup.id}`, { traceId, followupId: followup.id, reason });
      return;
    }

    logger.info("JOB_STARTED", `Job travado e processamento iniciado`, { 
      traceId, 
      job_id: followup.id,
      rule_id: followup.rule_id,
      telefone: followup.phone,
      worker_id,
      timestamp: now
    });

    // 6. LOG OBRIGATÓRIO: JOB_PROCESSING
    logger.info("JOB_PROCESSING", `Executando lógica de negócio para o job`, { 
      traceId, 
      job_id: followup.id,
      rule_id: followup.rule_id,
      telefone: followup.phone,
      worker_id,
      timestamp: now
    });



    // 1. Logar o telefone bruto recebido
    logger.info("FOLLOWUP_PHASE_1_START", "Iniciando processamento de telefone", { 
      traceId, 
      followupId: followup.id, 
      rawPhone: followup.phone 
    });

    // 2. Normalização do Telefone
    const { normalizeBrazilianPhone } = await import("@/lib/phone");
    const normalized = normalizeBrazilianPhone(followup.phone);
    
    if (!normalized || normalized.reason) {
      await blockFollowup(
        followup.id, 
        "INVALID_PHONE", 
        `Telefone inválido: ${normalized?.reason || "FORMAT_NOT_RECOGNIZED"}`, 
        traceId,
        {
          rawPhone: followup.phone,
          normalizedPhone: normalized?.full || null,
          phoneValidatorInput: followup.phone,
          validatorReason: normalized?.reason || "NULL_OR_UNDEFINED",
          details: normalized
        }
      );
      return;
    }

    // 3. Busca ou Criação de Conversa
    await updateFollowupStep(followup.id, "FOLLOWUP_CONVERSATION_LOOKUP", traceId);
    
    const instance = followup.metadata?.instance || "agente-5541998430354";
    
    await updateFollowupStep(followup.id, "FOLLOWUP_CONVERSATION_LOOKUP", traceId);
    
    let conversation: any;
    try {
      conversation = await ConversationService.findOrCreate({
        instance,
        phone_number: normalized.full,
        contact_name: followup.metadata?.contact_name || 'Cliente',
        metadata: { traceId, followupId: followup.id }
      });
      
      // 3. LOG DA CONVERSA
      const convLogStatus = conversation.created_at && new Date(conversation.created_at).getTime() > Date.now() - 10000 
        ? "conversation criada" 
        : "conversation encontrada";

      logger.info("LOG_DA_CONVERSA", `Resolução de conversa concluída`, {
        traceId,
        status: convLogStatus,
        conversation_id: conversation.id,
        job_id: followup.id,
        timestamp: new Date().toISOString()
      });

      await updateFollowupMetadata(followup.id, { 
        conversationId: conversation.id,
        instanceUsed: instance,
        conversationStatus: conversation.status,
        conversationLogStatus: convLogStatus
      });
      
      if (convLogStatus === "conversation criada") {
        await updateFollowupStep(followup.id, "FOLLOWUP_CONVERSATION_CREATED", traceId);
      }
    } catch (convErr: any) {

      const dbErrorInfo = {
        code: convErr.code,
        message: convErr.message,
        details: convErr.details || null,
        hint: convErr.hint || null,
        traceId
      };
      
      await blockFollowup(followup.id, "CONVERSATION_CREATION_FAILED", `Erro ao resolver conversa: ${convErr.message}`, traceId, {
        dbError: dbErrorInfo
      });
      return;
    }

    const ctx = (conversation.customer_context as any) || {};
    const attendanceMode = ctx.attendance_mode || (conversation as any).attendance_mode;
    
    if (attendanceMode === "human" || conversation.status === "atendido_humano") {
      await blockFollowup(followup.id, "HUMAN_TAKEOVER", "Cliente em atendimento humano", traceId);
      return;
    }

    // Adiciona log de início de geração
    await updateFollowupStep(followup.id, "FOLLOWUP_GENERATION_STARTED", traceId);

    let messageText = followup.message_template;
    if (!messageText) {
       messageText = await generateAiFollowup(followup, conversation, traceId);
    } else {
      // 6. TEMPLATE FIXO (Se vier de uma regra com mensagem fixa)
      const nameData = await resolveFollowupCustomerName(followup, conversation, traceId);
      if (nameData.firstName) {
        messageText = messageText.replace(/{{nome}}/g, nameData.fullName || "");
        messageText = messageText.replace(/{{primeiro_nome}}/g, nameData.firstName || "");
      } else {
        messageText = messageText.replace(/,?\s?{{nome}}/g, "");
        messageText = messageText.replace(/,?\s?{{primeiro_nome}}/g, "");
      }
    }

    if (!messageText) {
      throw new Error("MESSAGE_GENERATION_FAILED: O retorno da IA ou template fixo está vazio.");
    }

    await updateFollowupStep(followup.id, "FOLLOWUP_GENERATION_COMPLETED", traceId);

    // Envio para Evolution
    await updateFollowupStep(followup.id, "FOLLOWUP_EVOLUTION_STARTED", traceId);
    
    const { sendEvolutionText } = await import("@/lib/evolution.server");
    
    // 8. Se pegou, mostrar: FOLLOWUP_EVOLUTION_STARTED, payload enviado
    const evolutionPayload = {
      instance: conversation.instance,
      phone: conversation.phone_number,
      message: messageText
    };
    
    // 2. LOG DA EVOLUTION: FOLLOWUP_EVOLUTION_STARTED
    logger.info("FOLLOWUP_EVOLUTION_STARTED", "Payload enviado para Evolution API", { 
      traceId, 
      job_id: followup.id,
      payload: evolutionPayload,
      timestamp: new Date().toISOString()
    });

    await updateFollowupMetadata(followup.id, {
      phoneBeforeValidation: followup.phone,
      phoneSentToEvolution: normalized.full,
      evolutionInstance: conversation.instance,
      evolutionPhoneNumber: conversation.phone_number,
      evolutionPayload,
      evolution_started_at: new Date().toISOString()
    });

    const success = await sendEvolutionText(instance, conversation.phone_number, messageText);

    // 2. LOG DA EVOLUTION: Resposta HTTP e MessageId
    // Nota: supomos que a Evolution API retorna um ID no sucesso
    logger.info("FOLLOWUP_EVOLUTION_RESPONSE", `Evolution API response: ${success ? 'SUCCESS' : 'FAILED'}`, { 
      traceId, 
      job_id: followup.id,
      success,
      timestamp: new Date().toISOString()
    });


    if (!success) {
      await updateFollowupStep(followup.id, "FOLLOWUP_EVOLUTION_FAILED", traceId);
      throw new Error("EVOLUTION_HTTP_ERROR: Falha ao enviar mensagem via Evolution API.");
    }

    // 10. Atualizar status: PROCESSING ↓ SENT (o status SENT é definido abaixo)
    await updateFollowupStep(followup.id, "FOLLOWUP_EVOLUTION_SUCCESS", traceId);

    const completionTime = new Date().toISOString();
    
    // 1. LOG DO WORKER: JOB_FINISHED
    logger.info("JOB_FINISHED", `Job processado com sucesso`, { 
      traceId, 
      job_id: followup.id,
      rule_id: followup.rule_id,
      telefone: followup.phone,
      worker_id,
      timestamp: completionTime
    });

    await (supabaseAdmin.rpc("append_wa_message" as any, {
      p_phone: followup.phone,
      p_message: { id: `fup-${Date.now()}`, role: 'assistant', parts: [{ type: 'text', text: messageText }], createdAt: completionTime },
      p_instance: conversation.instance,
      p_phone_number: conversation.phone_number,
      p_increment_unread: false,
      p_new_status: "aguardando"
    } as any) as any);

    await supabaseAdmin
      .from("crm_followups")
      .update({
        status: "SENT",
        attempts: (followup.attempts || 0) + 1,
        sent_at: completionTime,
        completed_at: completionTime,
        message_template: messageText,
        updated_at: completionTime,
        metadata: {
          ...(followup.metadata || {}),
          last_step: "FOLLOWUP_SENT",
          evolution_success: true,
          worker_id,
          finished_at: completionTime
        }
      } as any)
      .eq("id", followup.id);


  } catch (err: any) {
    const errorInfo = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      traceId,
      followupId: followup.id,
      workerId: "JuliaFollowupProcessorV2"
    };

    logger.error("FOLLOWUP_EXECUTION_FAILED", err.message, errorInfo);

    const isFinalAttempt = (followup.attempts || 0) >= 2;
    
    await supabaseAdmin
      .from("crm_followups")
      .update({
        status: isFinalAttempt ? "CANCELED" : "READY",
        attempts: (followup.attempts || 0) + 1,
        cancel_reason: isFinalAttempt ? "UNHANDLED_EXCEPTION" : null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(followup.metadata || {}),
          last_error: errorInfo,
          last_step: "FOLLOWUP_ERROR"
        }
      } as any)
      .eq("id", followup.id);
  }
}

async function updateFollowupMetadata(id: string, newMetadata: any) {
  const { data: followup } = await supabaseAdmin.from("crm_followups").select("metadata").eq("id", id).single();
  const metadata = (followup?.metadata as any) || {};
  
  await supabaseAdmin
    .from("crm_followups")
    .update({ 
      metadata: { ...metadata, ...newMetadata },
      updated_at: new Date().toISOString()
    } as any)
    .eq("id", id);
}

async function updateFollowupStep(id: string, step: string, traceId: string) {
  const { data: followup } = await supabaseAdmin.from("crm_followups").select("metadata").eq("id", id).single();
  const metadata = (followup?.metadata as any) || {};
  const timeline = metadata.timeline || [];
  timeline.push({ step, at: new Date().toISOString(), traceId });

  await supabaseAdmin
    .from("crm_followups")
    .update({ 
      metadata: { ...metadata, timeline, last_step: step },
      updated_at: new Date().toISOString()
    } as any)
    .eq("id", id);
}

async function blockFollowup(id: string, reasonCode: string, message: string, traceId: string, additionalMetadata: any = {}) {
  logger.info("FOLLOWUP_BLOCKED", message, { traceId, followupId: id, reasonCode, ...additionalMetadata });
  await supabaseAdmin
    .from("crm_followups")
    .update({
      status: "CANCELED",
      cancel_reason: reasonCode,
      cancelled_at: new Date().toISOString(),
      metadata: { 
        blocker: reasonCode, 
        blocker_message: message, 
        last_step: "FOLLOWUP_BLOCKED",
        ...additionalMetadata
      },
      updated_at: new Date().toISOString()
    } as any)
    .eq("id", id);
}

async function resolveFollowupCustomerName(followup: any, conversation: any, traceId: string) {
  let fullName = "";
  let source = "";

  // 1. customer vinculado ao followup
  if (followup.metadata?.contact_name && followup.metadata.contact_name !== "Cliente") {
    fullName = followup.metadata.contact_name;
    source = "followup_metadata";
  }

  // 2. wa_conversas.contact_name
  if (!fullName && conversation.contact_name && conversation.contact_name !== "Cliente") {
    fullName = conversation.contact_name;
    source = "wa_conversas";
  }

  // 3. CRM customer (se crm_followups.customer_id existir e for UUID)
  if (!fullName && followup.customer_id) {
    const { data: crmCustomer } = await supabaseAdmin
      .from("crm_customer_pipeline")
      .select("name")
      .eq("id", followup.customer_id)
      .maybeSingle();
    
    if (crmCustomer?.name) {
      fullName = crmCustomer.name;
      source = "CRM";
    }
  }

  // 4. BEMP customer
  if (!fullName && conversation.phone_number) {
    try {
      // Normalizar para o formato que a BEMP espera: DDI, DDD, Numero
      const phone = conversation.phone_number.replace(/\D/g, ''); // 5511999999999
      const countryCode = phone.substring(0, 2);
      const areaCode = phone.substring(2, 4);
      const number = phone.substring(4);
      
      const bempData = await BempService.findCustomerByPhone({ countryCode, areaCode, number });
      if (bempData?.name) {
        fullName = bempData.name;
        source = "BEMP";
      }
    } catch (e) {
      logger.debug("BEMP_NAME_LOOKUP_FAILED", "Falha ao buscar nome na BEMP", { traceId, phone: conversation.phone_number });
    }
  }

  // 5. Contexto da conversa
  if (!fullName && conversation.customer_context?.name) {
    fullName = conversation.customer_context.name;
    source = "conversation_context";
  }

  if (!fullName) {
    return { fullName: null, firstName: null, source: "none" };
  }

  // Normalizar: remover "Cliente", "Cliente VIP", etc.
  const invalidNames = ["cliente", "cliente vip", "usuário", "contato", "usuario"];
  if (invalidNames.includes(fullName.toLowerCase().trim())) {
    return { fullName: null, firstName: null, source: "none" };
  }

  const firstName = fullName.split(' ')[0];
  
  logger.info("FOLLOWUP_CUSTOMER_NAME_RESOLVED", `Nome resolvido via ${source}`, { 
    traceId, 
    source, 
    hasName: true, 
    firstName 
  });

  // 8. Persistência no wa_conversas se for de fonte confiável
  if (["CRM", "BEMP"].includes(source) && (!conversation.contact_name || conversation.contact_name === "Cliente")) {
    await supabaseAdmin
      .from("wa_conversas")
      .update({ contact_name: fullName } as any)
      .eq("phone", conversation.phone);
  }

  return { fullName, firstName, source };
}

async function generateAiFollowup(followup: any, conversation: any, traceId: string): Promise<string> {
  const nameData = await resolveFollowupCustomerName(followup, conversation, traceId);
  
  const stage = followup.stage || followup.metadata?.stage || 'Geral';
  
  // 5. PASSAR O NOME PARA A IA
  const nameInstruction = nameData.firstName 
    ? `O nome do cliente é ${nameData.fullName} (primeiro nome: ${nameData.firstName}). Quando customerFirstName estiver disponível, use-o naturalmente na saudação. Nunca invente um nome. Nunca use "Cliente" como nome.`
    : `O nome do cliente não está disponível. Não use "Cliente" ou "Cliente VIP" como nome. Use uma saudação sem nome, como "Olá! 💜" ou "Oi! Tudo bem? 💜".`;

  const prompt = `Você é Julia, a assistente inteligente do Salão Seja Livre.
Escreva uma mensagem de WhatsApp curta e humanizada.
${nameInstruction}
Contexto: Este é um contato de follow-up do tipo "${stage}".
Objetivo: Ser gentil, profissional e incentivar o retorno ao salão.
Não use emojis em excesso. Não use linguajar formal demais.
Mensagem:`;

  try {
    const apiKey = await getAiKey();
    if (!apiKey) {
      logger.error("AI_KEY_MISSING", "Chave de IA não encontrada para follow-up", { traceId });
      return "";
    }

    const provider = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: provider("google/gemini-2.5-flash") as any,
      prompt,
    });
    
    if (!text) {
      logger.warn("AI_EMPTY_RESPONSE", "IA retornou texto vazio", { traceId, prompt });
      return "";
    }
    
    // 6. TEMPLATE FIXO / REPLACE
    let finalMsg = text;
    if (nameData.firstName) {
      finalMsg = finalMsg.replace(/{{nome}}/g, nameData.fullName || "");
      finalMsg = finalMsg.replace(/{{primeiro_nome}}/g, nameData.firstName || "");
    } else {
      finalMsg = finalMsg.replace(/,?\s?{{nome}}/g, "");
      finalMsg = finalMsg.replace(/,?\s?{{primeiro_nome}}/g, "");
    }
    
    return finalMsg;
  } catch (e: any) {
    logger.error("AI_GENERATION_ERROR", e.message, { traceId, error: e, prompt });
    return "";
  }
}

async function discoverNewFollowups(traceId: string) {
  const { data: rules } = await (supabaseAdmin.from("crm_followup_rules" as any) as any).select("*").eq("enabled", true);
  if (!rules) return;

  for (const rule of (rules as FollowupRule[])) {
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
    .lt("last_interaction_at", threshold);

  if (!abandoned) return;

  for (const conv of (abandoned as any[])) {
    const { data: existing } = await supabaseAdmin.from("crm_followups").select("id").eq("phone", conv.phone).eq("rule_id" as any, rule.id).maybeSingle();
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
