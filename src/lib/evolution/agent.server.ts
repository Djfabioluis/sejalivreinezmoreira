import { NormalizedEvolutionMessage } from "./types";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey } from "./contact";

interface AgentRecord {
  id: string;
  status: string;
  status_conexao: string;
  ia_ativa: boolean;
  unidade_id: string;
  instancia: string;
}

export async function findAgentByInstance(instanceName: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const instance = instanceName.trim();
  const normalizedInstance = instance.toLowerCase();
  
  // Requisito 6: Buscar até 2 registros para detectar duplicidade
  // Usamos ILIKE para normalização de case no banco
  const { data, error } = await supabaseAdmin
    .from("wa_agentes" as never)
    .select("id, status, status_conexao, ia_ativa, unidade_id, instancia")
    .ilike("instancia", normalizedInstance)
    .limit(2) as unknown as { data: AgentRecord[] | null, error: any };

  if (error) {
    await logEvent({ 
      instance, 
      event: "agent_lookup", 
      status: "error", 
      errorDetail: error.message 
    });
    return null;
  }

  if (!data || data.length === 0) {
    await logEvent({ 
      instance, 
      event: "agent_lookup", 
      status: "agent_not_found" 
    });
    return null;
  }

  // Requisito 6: Lógica de resolução de duplicidade
  if (data.length > 1) {
    console.warn(`[AGENT_DUPLICITY_DETECTED] Instance: ${instance}. Found ${data.length} agents.`);
    // Priorizar agentes com IA ativa e unidade vinculada
    const preferred = data.find((a: any) => a.ia_ativa !== false && !!a.unidade_id) || data[0];
    
    await logEvent({
      instance,
      event: "agent_lookup",
      status: "duplicate_agents_resolved",
      payload: { 
        count: data.length, 
        resolvedId: preferred.id,
        reason: "priority_to_active_with_unit"
      }
    });
    
    return preferred;
  }

  const agent = (data[0] as any);
  
  // Log detalhado do Match (Requisito 2)
  console.log(`[INSTANCE_AGENT_MATCH]
incomingInstance: ${instanceName}
normalizedInstance: ${normalizedInstance}
matchedAgentId: ${agent.id}
unitId: ${agent.unidade_id}
iaAtiva: ${agent.ia_ativa !== false}`);

  if (!agent.unidade_id) {
    await logEvent({ 
      instance, 
      event: "agent_lookup", 
      status: "agent_without_unit" 
    });
  }

  return agent;
}

export function isIAEnabled(agent: any): boolean {
  if (!agent) return false;

  const instance = agent.instancia || "unknown";
  const agentId = agent.id || "unknown";
  const unitId = agent.unidade_id || null;
  const status = String(agent.status || "").toLowerCase().trim();
  const statusConexao = agent.status_conexao || "unknown";
  const iaAtiva = agent.ia_ativa !== false;

  const administrativelyDisabled = ["desativado", "disabled"].includes(status);
  
  const result = iaAtiva && !!unitId && !administrativelyDisabled;
  
  // LOG OBRIGATÓRIO (Requisito 9)
  console.log(`[AGENT_AI_STATUS_CHECK]
instance: ${instance}
agentId: ${agentId}
unitId: ${unitId}
status: ${status}
statusConexao: ${statusConexao}
iaAtiva: ${iaAtiva}
result: ${result}
${!result ? `reason: ${!iaAtiva ? "ia_desativada_pelo_usuario" : !unitId ? "sem_unidade_vinculada" : "agente_desativado_administrativamente"}` : ""}`);

  return result;
}

export async function runAgentFlow(msg: NormalizedEvolutionMessage, textOverride?: string) {
  const messageId = msg.messageId;
  const instance = msg.instance;
  const trace = (msg as any)._trace;
  const traceId = trace?.getTraceId() || (msg as any)._traceId || `${instance}:${messageId}`;
  const fromMe = (msg as any).fromMe === true;

  trace?.record("AGENT_RESOLVED_FROM_INSTANCE");

  try {
    const text = textOverride?.trim() || extractMessageText(msg.message);
    trace?.record("MESSAGE_PARSED", { textSnippet: text?.slice(0, 50) });

    const agent = await findAgentByInstance(instance);
    
    if (agent) {
      trace?.record("AGENT_RESOLVED", { 
        agentId: agent.id,
        aiEnabled: isIAEnabled(agent)
      });
      trace?.record("UNIT_RESOLVED", { unitId: agent.unidade_id });
    }


    // Identidade resolvida pelo processor (inclusive contatos @lid) tem prioridade
    // absoluta sobre remoteJid, evitando abrir/enviar para uma conversa LID errada.
    const contactPhone = (msg as any)._resolvedPhone || normalizePhone(msg.remoteJid);
    const conversationKey = (msg as any)._conversationKey || buildConversationKey(instance, contactPhone);
    
    trace?.record("CONVERSATION_LOOKUP_STARTED", { conversationKey });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { HUMAN_TAKEOVER_TIMEOUT_MINUTES } = await import("../config");

    const { data: conversation } = await supabaseAdmin
      .from("wa_conversas" as any)
      .select("id, messages, customer_context, contact_name, attendance_mode, human_takeover_at, human_takeover_detected, human_takeover_requested_at, human_transfer_message_sent, ai_paused_at, ai_pause_reason, last_human_message_at, phone, instance, unidade_id")
      .eq("phone", conversationKey)
      .maybeSingle();

    let conv = conversation as any;
    trace?.record("CONVERSATION_LOOKUP_COMPLETED", { hasConv: !!conv });

    // REMOVIDO FALLBACK GLOBAL POR TELEFONE (Segurança Multi-instância)
    if (conv && conv.instance !== instance) {
      trace?.record("CROSS_INSTANCE_CONVERSATION_REJECTED", { 
        incomingInstance: instance,
        conversationInstance: conv.instance,
        phoneLast4: contactPhone.slice(-4)
      });
      conv = null;
    }

    const finalKey = conv?.phone || conversationKey;

    // 6. Persistência imediata
    trace?.record("CONTEXT_LOAD_STARTED");
    const { normalizeIncomingMessage } = await import("./media-normalizer");
    const { mediaPlaceholderText } = await import("./media-pipeline.server");
    const normalized = normalizeIncomingMessage(msg.message, messageId);
    const isMedia = normalized.messageType !== "text";
    const displayText = isMedia ? mediaPlaceholderText(normalized) : text || "[Mídia/Outro]";
    const isIAActive = isIAEnabled(agent);

    const { appendIncomingMessage } = await import("./conversation.server");
    
    // Otimização (Requisito 10): Não duplicar persistência se já foi persistido no processor
    if (!conv || !conv.messages || conv.messages.length === 0) {
      const savedConv = await appendIncomingMessage({
        conversationKey: conversationKey, 
        messageId: messageId,
        text: displayText,
        instance: msg.instance,
        phone: contactPhone,
        contactName: (msg as any).pushName || undefined,
        isIAActive,
        metadata: isMedia ? { sourceType: normalized.messageType } : null,
      });
      if (savedConv) conv = savedConv;
    }
    trace?.record("CONTEXT_LOAD_COMPLETED", { historyCount: conv?.messages?.length || 0 });

    const isHumanMode =
      conv?.instance === instance && (
        conv?.attendance_mode === "HUMAN" ||
        conv?.human_takeover_detected === true ||
        !!conv?.ai_paused_at
      );

    trace?.record("CONVERSATION_CORRELATION", {
      incomingInstance: instance,
      customerPhoneLast4: contactPhone.slice(-4),
      expectedConversationKey: conversationKey,
      loadedConversationKey: conv?.phone,
      loadedConversationInstance: conv?.instance,
      sameInstance: conv?.instance === instance,
      attendanceMode: conv?.attendance_mode || "AI"
    });

    if (isHumanMode) {
      const stage = "CONVERSATION_MODE_CHECKED";
      const reason = conv?.ai_pause_reason || "HUMAN_TAKEOVER_ACTIVE";
      
      trace?.record(stage, { 
        mode: "HUMAN", 
        human_takeover_detected: conv?.human_takeover_detected,
        ai_paused_at: conv?.ai_paused_at,
        ai_pause_reason: reason
      });

      const customerRequested = conv?.ai_pause_reason === "CUSTOMER_REQUESTED_HUMAN";
      const takeoverAtStr = conv?.human_takeover_at;
      const takeoverAt = takeoverAtStr ? new Date(takeoverAtStr).getTime() : 0;
      const minutesSinceTakeover = takeoverAt > 0 ? (Date.now() - takeoverAt) / 60000 : 0;

      const stillPaused =
        customerRequested || takeoverAt === 0 || minutesSinceTakeover < HUMAN_TAKEOVER_TIMEOUT_MINUTES;

      if (stillPaused) {
        trace?.record("MESSAGE_PROCESSING_ABORTED", { 
          stage, 
          reason,
          traceId,
          conversationId: finalKey,
          instanceId: instance,
          phoneLast4: contactPhone.slice(-4)
        });
        trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "human_mode_blocked" });
        return;
      }


      await supabaseAdmin
        .from("wa_conversas")
        .update({
          attendance_mode: "AI",
          human_takeover_at: null,
          human_takeover_detected: false,
          human_transfer_message_sent: false,
          ai_paused_at: null,
          ai_pause_reason: null,
        })
        .eq("phone", finalKey);
      
      trace?.record("CONVERSATION_MODE_CHANGED_TO_AI");
    } else {
      trace?.record("ATTENDANCE_MODE_CHECKED", { mode: "AI" });
    }

    if (text) {
      const { detectHumanTakeoverIntent, HUMAN_TRANSFER_MESSAGE, AI_PAUSE_REASON_CUSTOMER } =
        await import("@/lib/human-takeover");

      if (detectHumanTakeoverIntent(text)) {
        trace?.record("HUMAN_TAKEOVER_INTENT_DETECTED");
        const alreadySent = conv?.human_transfer_message_sent === true;
        const nowIso = new Date().toISOString();

        await supabaseAdmin
          .from("wa_conversas")
          .update({
            attendance_mode: "HUMAN",
            human_takeover_detected: true,
            human_takeover_at: nowIso,
            human_takeover_requested_at: nowIso,
            ai_paused_at: nowIso,
            ai_pause_reason: AI_PAUSE_REASON_CUSTOMER,
            human_transfer_message_sent: true,
          })
          .eq("phone", finalKey);

        trace?.record("MESSAGE_PROCESSING_ABORTED", { 
          stage: "HUMAN_INTENT_CHECK", 
          reason: "human_takeover_intent_detected",
          traceId
        });

        if (!alreadySent) {

          const { replyWithAI } = await import("./reply.server");
          await replyWithAI({
            instance,
            phone: contactPhone,
            text: HUMAN_TRANSFER_MESSAGE,
            conversationKey: finalKey,
            messageId,
            unitId: agent?.unidade_id ?? null,
            allowDuringHumanMode: true
          }, traceId);

        }
        trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "human_handoff" });
        return;
      }
    }

    const iaEnabled = isIAActive;

    if (!iaEnabled) {
      trace?.record("MESSAGE_PROCESSING_ABORTED", { 
        stage: "IA_STATUS_CHECK", 
        reason: "ia_disabled_for_agent",
        traceId,
        agentId: agent?.id
      });
      trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "ia_disabled" });
      return;
    }


    // Double-check race condition
    const { data: finalCheck } = await supabaseAdmin
      .from("wa_conversas")
      .select("attendance_mode")
      .eq("phone", finalKey)
      .maybeSingle();

    if (finalCheck?.attendance_mode === "HUMAN") {
      trace?.record("MESSAGE_PROCESSING_ABORTED", { 
        stage: "RACE_CONDITION_CHECK", 
        reason: "human_mode_detected_late",
        traceId
      });
      trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "race_condition_human" });
      return;
    }


    if (!text) {
      trace?.record("MESSAGE_PROCESSING_ABORTED", { 
        stage: "FINAL_TEXT_CHECK", 
        reason: "no_text_to_process",
        traceId
      });
      trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "empty_text" });
      return;
    }


    const { normalizeConversationHistory } = await import("./history");
    const history = normalizeConversationHistory(
      (conv?.messages as any[]) || [],
      text,
      messageId
    );

    const {
      extractBookingSlots,
      mergeBookingContext,
      detectSubscriptionIntent,
      nextRequiredSlot,
      isShortAffirmative,
      ensureNoDuplicateBookingQuestion,
    } = await import("@/lib/booking/context");
    const { patchCustomerContext } = await import("@/lib/chat.server");

    const customerContext = (conv?.customer_context as any) || {};

    const previousContext = {
      unitId: customerContext.bookingContext?.unitId ?? agent.unidade_id ?? null,
      serviceId: customerContext.bookingContext?.serviceId ?? customerContext.service_id ?? null,
      serviceName: customerContext.bookingContext?.serviceName ?? customerContext.service_name ?? null,
      serviceText: customerContext.bookingContext?.serviceText ?? null,
      date: customerContext.bookingContext?.date ?? customerContext.date ?? null,
      period: customerContext.bookingContext?.period ?? null,
      time: customerContext.bookingContext?.time ?? customerContext.time ?? null,
      professionalId: customerContext.bookingContext?.professionalId ?? customerContext.professional_id ?? null,
      professionalName: customerContext.bookingContext?.professionalName ?? customerContext.professional_name ?? null,
      subscriptionIntent: customerContext.bookingContext?.subscriptionIntent === true,
      conversationGreeted: customerContext.bookingContext?.conversationGreeted === true,
      selectedSlot: customerContext.bookingContext?.selectedSlot ?? null,
      selectedSlotEnd: customerContext.bookingContext?.selectedSlotEnd ?? null,
      awaitingConfirmation: customerContext.bookingContext?.awaitingConfirmation === true,
      customerConfirmed: customerContext.bookingContext?.customerConfirmed === true,
      appointmentId: customerContext.bookingContext?.appointmentId ?? null,
      appointmentStatus: customerContext.bookingContext?.appointmentStatus ?? "NONE",
      availableSlots: customerContext.bookingContext?.availableSlots ?? [],
    };

    trace?.record("BOOKING_CONTEXT_LOADED", { service: previousContext.serviceName });

    const extracted: any = extractBookingSlots(text);

    // BEMP proativo - OTIMIZADO: Somente se o texto parecer um serviço e não tivermos no contexto
    if (!previousContext.serviceId && agent?.unidade_id && text.length > 3 && text.length < 50) {
      const { normalizeServiceSearchText } = await import("@/lib/service-utils");
      const normalizedText = normalizeServiceSearchText(text);
      if (normalizedText && normalizedText.length > 3) {
        trace?.record("BEMP_SERVICE_LOOKUP_STARTED");
        const { BempService } = await import("@/lib/bemp-service.server");
        try {
          const services = await BempService.listServices(agent.unidade_id);
          const found = services.find((s: any) => {
            const sName = normalizeServiceSearchText(s.name);
            return sName === normalizedText || normalizedText.includes(sName);
          });
          if (found) {
            extracted.serviceId = String(found.id);
            extracted.serviceName = String(found.name);
            trace?.record("BEMP_SERVICE_LOOKUP_COMPLETED", { found: found.name });
          } else {
            trace?.record("BEMP_SERVICE_LOOKUP_COMPLETED", { found: null });
          }
        } catch (err) {}
      }
    }

    const explicitSubscription = detectSubscriptionIntent(text);
    if (explicitSubscription) extracted.subscriptionIntent = true;

    console.log(`[BOOKING_CONTEXT_BEFORE] ${JSON.stringify(previousContext)}`);
    const bookingContext = mergeBookingContext(previousContext, extracted);
    console.log(`[BOOKING_FIELDS_EXTRACTED] ${JSON.stringify(extracted)}`);
    console.log(`[BOOKING_CONTEXT_AFTER] ${JSON.stringify(bookingContext)}`);
    
    // MÁQUINA DE ESTADOS DETERMINÍSTICA - CONFIRMAÇÃO
    if (bookingContext.appointmentStatus === "AWAITING_CONFIRMATION" && isShortAffirmative(text)) {
      bookingContext.customerConfirmed = true;
      bookingContext.awaitingConfirmation = false;
      bookingContext.appointmentStatus = "CREATING";
      trace?.record("BOOKING_CUSTOMER_CONFIRMED");
    }

    // MÁQUINA DE ESTADOS DETERMINÍSTICA - SELEÇÃO DE HORÁRIO
    if (bookingContext.availableSlots?.length && !bookingContext.selectedSlot) {
      const selected = bookingContext.availableSlots.find(s => text.includes(s) || (bookingContext.time && s.includes(bookingContext.time)));
      if (selected) {
        bookingContext.selectedSlot = selected;
        bookingContext.time = selected.split(' ')[0] || selected;
        bookingContext.appointmentStatus = "AWAITING_CONFIRMATION";
        bookingContext.awaitingConfirmation = true;
        trace?.record("BOOKING_SLOT_SELECTED", { slot: selected });
      }
    }

    if (agent.unidade_id) bookingContext.unitId = String(agent.unidade_id);

    // CRIAÇÃO DETERMINÍSTICA PÓS CONFIRMAÇÃO
    if (bookingContext.customerConfirmed === true && bookingContext.appointmentStatus === "CREATING") {
       trace?.record("BOOKING_CREATE_STARTED");
       const { BempService, extractBempAppointmentId } = await import("@/lib/bemp-service.server");
       
       // IDEMPOTÊNCIA: Verificar se já não tentamos criar este agendamento (start + service)
       const idempotencyKey = `${finalKey}:${bookingContext.serviceId}:${bookingContext.selectedSlot || bookingContext.time}`;
       
       try {
         const result = await BempService.createAppointment({
           salon_id: Number(bookingContext.unitId),
           service_id: Number(bookingContext.serviceId),
           professional_id: bookingContext.professionalId ? Number(bookingContext.professionalId) : undefined,
           start: bookingContext.selectedSlot || `${bookingContext.date}T${bookingContext.time}:00`,
           end: bookingContext.selectedSlotEnd || undefined,
           name: (msg as any).pushName || conv?.contact_name || "Cliente",
           phone_country_code: "55",
           phone_area_code: contactPhone.slice(0, 2),
           phone_number: contactPhone.slice(2),
         });

         const apptId = extractBempAppointmentId(result);
         if (apptId) {
           bookingContext.appointmentId = String(apptId);
           bookingContext.appointmentStatus = "CONFIRMED";
           trace?.record("BOOKING_CREATE_SUCCESS", { appointmentId: apptId });
           
           // Resposta Final Obrigatória
           const finalMsg = `Agendamento confirmado! 💜\n\nServiço: ${bookingContext.serviceName}\nData: ${bookingContext.date}\nHorário: ${bookingContext.time}\nUnidade: ${agent.nome || 'Centro'}\n\nTe esperamos! ✨`;
           
           const { replyToUser } = await import("./reply.server");
           await replyToUser({
             instance,
             phone: contactPhone,
             text: finalMsg,
             conversationKey: finalKey,
             messageId,
             traceId,
             unitId: agent.unidade_id,
             _trace: trace
           } as any);

           await patchCustomerContext(finalKey, { bookingContext });
           trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "booking_confirmed" });
           return;
         } else {
           bookingContext.appointmentStatus = "FAILED";
           trace?.record("BOOKING_CREATE_FAILED", { error: "No ID returned" });
         }
       } catch (err: any) {
         bookingContext.appointmentStatus = "FAILED";
         trace?.record("BOOKING_CREATE_FAILED", { error: err.message });
       }
    }


    trace?.record("BOOKING_CONTEXT_MERGED");

    const requiredSlot = nextRequiredSlot(bookingContext);
    trace?.record("NEXT_REQUIRED_SLOT", { slot: requiredSlot });

    await patchCustomerContext(finalKey, {
      bookingContext,
      service_id: bookingContext.serviceId ?? null,
      service_name: bookingContext.serviceName ?? null,
      subscriptionIntent: bookingContext.subscriptionIntent === true,
      intent: bookingContext.intent ?? null,
    });

    // REGRA DETERMINÍSTICA: BOULEVARD_HARMONIZATION_REFERRAL
    const BOULEVARD_UNIT_ID = "1378";
    if (String(agent.unidade_id) === BOULEVARD_UNIT_ID && bookingContext.intent === "harmonizacao_bumbum_barriga") {
      const referralPhone = "(41) 99952-9624";
      const referralText = "Esse procedimento é realizado pela clínica responsável parceira da nossa unidade. 💜 Para informações e agendamento sobre harmonização de bumbum ou barriga, você pode falar diretamente pelo número " + referralPhone + ".";
      
      trace?.record("BOULEVARD_HARMONIZATION_REFERRAL", { referralPhone });
      
      const { logEvent } = await import("./logger.server");
      await logEvent({
        instance,
        messageId,
        event: "BOULEVARD_HARMONIZATION_REFERRAL",
        status: "success",
        payload: {
          customerPhone: contactPhone,
          referralPhone,
          intent: bookingContext.intent,
          unitId: agent.unidade_id
        }
      });

      const { replyToUser } = await import("./reply.server");
      await replyToUser({
        instance,
        phone: contactPhone,
        text: referralText,
        conversationKey: finalKey,
        messageId,
        traceId,
        unitId: agent.unidade_id,
        _trace: trace
      } as any);

      trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "boulevard_referral" });
      return;
    }

    // REQUISITO 5: Fluxo Determinístico sem Gemini para perguntas estruturais
    const { getDeterministicResponse } = await import("@/lib/booking/lifecycle");
    const detResponse = getDeterministicResponse(bookingContext);
    
    if (detResponse) {
      const { replyToUser } = await import("./reply.server");
      trace?.record("DETERMINISTIC_RESPONSE_SENT", { slot: nextRequiredSlot(bookingContext) });
      
      await replyToUser({
        instance,
        phone: contactPhone,
        text: detResponse,
        conversationKey: finalKey,
        messageId,
        traceId,
        unitId: agent.unidade_id,
        _trace: trace
      } as any);

      trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "deterministic_reply" });
      return;
    }

    const { runAgentWithLogging } = await import("@/lib/chat.server");

    trace?.record("AI_REQUEST_STARTED", { model: "gemini-2.5-flash" });
    const result: any = await runAgentWithLogging({
      messages: history,
      instance,
      messageId,
      contactName: (msg as any).pushName || conv?.contact_name || undefined,
      text,
      unidadeId: agent.unidade_id,
      contactPhone,
      conversationKey: finalKey,
      customerContext: { ...customerContext, bookingContext },
      bookingContext,
      traceId
    } as any);
    trace?.record("AI_RESPONSE_RECEIVED");

    const replyText = String(result?.text || "").trim();
    if (!replyText) {
      trace?.record("MESSAGE_PROCESSING_ABORTED", { 
        stage: "AI_RESPONSE_RECEIVED", 
        reason: "empty_ai_response",
        traceId
      });
      trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "ai_empty_response" });
      
      // Requisito 2: Resposta vazia da IA deve gerar erro recuperável
      throw new Error("AI_EMPTY_RESPONSE: The AI returned an empty response.");
    }


    // Proteção contra perguntas duplicadas
    const { text: cleanReply, blocked: questionBlocked } = ensureNoDuplicateBookingQuestion(replyText, bookingContext);
    if (questionBlocked) {
      trace?.record("DUPLICATE_BOOKING_QUESTION_BLOCKED", { original: replyText, clean: cleanReply });
    }

    const { replyToUser } = await import("./reply.server");
    await replyToUser({
      instance,
      phone: contactPhone,
      text: cleanReply,
      conversationKey: finalKey,
      messageId,
      traceId,
      unitId: agent.unidade_id,
      _trace: trace
    } as any);

    if (bookingContext.conversationGreeted !== true) {
      await patchCustomerContext(finalKey, {
        bookingContext: { ...bookingContext, conversationGreeted: true },
      });
    }

    trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success" });
  } catch (error: any) {
    trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "error", error: error.message });
    // Propagar o erro para o processor (Requisito 2)
    throw error;
  }
}
