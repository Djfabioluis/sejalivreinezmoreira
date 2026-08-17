import { NormalizedEvolutionMessage } from "./types";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey } from "./contact";
import { logger } from "@/lib/observability/logger.server";

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
      isGenericGreeting,
      clearTransientBooking,
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
      professionalPreference: customerContext.bookingContext?.professionalPreference ?? null,
      professionalOptions: customerContext.bookingContext?.professionalOptions ?? undefined,
      dateLocked: customerContext.bookingContext?.dateLocked === true,
      subscriptionIntent: customerContext.bookingContext?.subscriptionIntent === true,
      conversationGreeted: customerContext.bookingContext?.conversationGreeted === true,
      selectedSlot: customerContext.bookingContext?.selectedSlot ?? null,
      selectedSlotEnd: customerContext.bookingContext?.selectedSlotEnd ?? null,
      awaitingConfirmation: customerContext.bookingContext?.awaitingConfirmation === true,
      customerConfirmed: customerContext.bookingContext?.customerConfirmed === true,
      appointmentId: customerContext.bookingContext?.appointmentId ?? null,
      appointmentStatus: customerContext.bookingContext?.appointmentStatus ?? "NONE",
      availableSlots: customerContext.bookingContext?.availableSlots ?? [],
      bookingSessionId: customerContext.bookingContext?.bookingSessionId ?? null,
      periodSessionId: customerContext.bookingContext?.periodSessionId ?? null,
      priceIntent: customerContext.bookingContext?.priceIntent === true,
      confirmationSentFor: customerContext.bookingContext?.confirmationSentFor ?? null,
    };


    trace?.record("BOOKING_CONTEXT_LOADED", {
      found: Boolean(customerContext.bookingContext),
      state: previousContext.appointmentStatus,
      unitId: previousContext.unitId,
      serviceId: previousContext.serviceId,
      serviceName: previousContext.serviceName,
      date: previousContext.date,
      period: previousContext.period,
      time: previousContext.time,
      selectedSlot: previousContext.selectedSlot,
      availableSlotsCount: previousContext.availableSlots.length,
    });

    // ============================================================
    // CANCELAMENTO — PRIORIDADE MÁXIMA (antes de qualquer estado/IA)
    // Diferencia fluxo em andamento x agendamento JÁ confirmado na BEMP.
    // ============================================================
    {
      const { handleCancelFlow } = await import("@/lib/booking/cancel-handler");
      const { BempService } = await import("@/lib/bemp-service.server");

      const cancelCtx = {
        ...previousContext,
        pendingCancellation: customerContext.bookingContext?.pendingCancellation === true,
        pendingCancellationBookingId:
          customerContext.bookingContext?.pendingCancellationBookingId ?? null,
        pendingCancellationOptions:
          customerContext.bookingContext?.pendingCancellationOptions ?? undefined,
      };

      const phoneParts = {
        phone_country_code: "55",
        phone_area_code: contactPhone.slice(0, 2),
        phone_number: contactPhone.slice(2),
      };

      const cancelResult = await handleCancelFlow({
        text,
        ctx: cancelCtx as any,
        conversationUnitId: agent.unidade_id ?? previousContext.unitId ?? null,
        deps: {
          listAppointments: () => BempService.listCustomerAppointments(phoneParts),
          cancelAppointment: (bookingId: string) =>
            BempService.cancelAppointment({ appointmentId: bookingId, ...phoneParts }),
        },
      });

      if (cancelResult.handled) {
        trace?.record("CANCEL_INTENT_DETECTED", {
          ...cancelResult.telemetry,
          skipServiceLookup: true,
          skipGemini: true,
        });

        await patchCustomerContext(finalKey, { bookingContext: cancelResult.nextContext ?? cancelCtx });

        const { replyWithAI } = await import("./reply.server");
        await replyWithAI(
          {
            instance,
            phone: contactPhone,
            text: cancelResult.message ?? "",
            conversationKey: finalKey,
            messageId,
            unitId: agent.unidade_id,
            _trace: trace,
          },
          traceId,
        );

        trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "cancel_intent" });
        return;
      }
    }

    const extracted: any = extractBookingSlots(text, new Date(), previousContext);
    const bookingContext = mergeBookingContext(previousContext, extracted);


    // ============================================================
    // PRICE_INTENT — Alta prioridade (após cancelamento)
    // ============================================================
    if (bookingContext.priceIntent && bookingContext.serviceText) {
      const { BempService } = await import("@/lib/bemp-service.server");
      const unitId = agent.unidade_id || bookingContext.unitId;
      
      if (unitId) {
        // Tentar resolver serviço da mensagem ou do contexto
        const serviceSearch = bookingContext.serviceText || bookingContext.serviceName;
        
        if (serviceSearch) {
          const { normalizeServiceSearchText } = await import("@/lib/service-utils");
          const query = normalizeServiceSearchText(serviceSearch);
          
          try {
            const allServices = await BempService.listServices(unitId);
            const matches = allServices.filter(s => {
              const sName = normalizeServiceSearchText(s.name || s.nome || "");
              return sName.includes(query) || query.includes(sName);
            });

            if (matches.length === 1) {
              const service = matches[0];
              const price = service.price || service.valor;
              const priceText = price != null 
                ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : null;
              
              if (priceText) {
                const response = `A ${service.name || service.nome} custa ${priceText} 💜\nQuer que eu veja os horários disponíveis?`;
                
                // Limpar priceIntent após responder, mas manter o resto do contexto
                const nextCtx = { ...bookingContext, priceIntent: false };
                if (!nextCtx.serviceId) {
                  nextCtx.serviceId = String(service.id);
                  nextCtx.serviceName = service.name || service.nome;
                }

                await patchCustomerContext(finalKey, { bookingContext: nextCtx });
                const { replyWithAI } = await import("./reply.server");
                await replyWithAI({
                  instance,
                  phone: contactPhone,
                  text: response,
                  conversationKey: finalKey,
                  messageId,
                  unitId: agent.unidade_id,
                  _trace: trace,
                  resolvedPrice: {
                    serviceId: String(service.id),
                    serviceName: service.name || service.nome || "serviço",
                    price: Number(price),
                    unitId: unitId,
                    source: "bemp:listServices"
                  }
                }, traceId);

                trace?.record("PRICE_RESPONSE_SENT", { serviceId: service.id, price: priceText });
                trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "price_intent_short_circuit" });
                return; // SHORT-CIRCUIT REAL

              } else {
                const response = `Encontrei o serviço "${service.name || service.nome}", mas o valor não está disponível no catálogo no momento. 💜`;
                const nextCtx = { ...bookingContext, priceIntent: false };
                await patchCustomerContext(finalKey, { bookingContext: nextCtx });
                const { replyWithAI } = await import("./reply.server");
                await replyWithAI({
                  instance, phone: contactPhone, text: response, conversationKey: finalKey, messageId, unitId: agent.unidade_id, _trace: trace
                }, traceId);
                return;
              }
            } else if (matches.length > 1) {
              const options = matches.map(s => {
                const price = s.price || s.valor;
                const pText = price != null 
                  ? `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "sob consulta";
                return `• ${s.name || s.nome} — ${pText}`;
              }).join("\n");
              
              const response = `Encontrei estas opções de ${serviceSearch} 💜\n\n${options}\n\nQual delas você deseja?`;
              const nextCtx = { ...bookingContext, priceIntent: false };
              await patchCustomerContext(finalKey, { bookingContext: nextCtx });
              const { replyWithAI } = await import("./reply.server");
              await replyWithAI({
                instance, 
                phone: contactPhone, 
                text: response, 
                conversationKey: finalKey, 
                messageId, 
                unitId: agent.unidade_id, 
                _trace: trace,
                resolvedPrices: matches.map(s => ({
                  serviceId: String(s.id),
                  serviceName: s.name || s.nome || "serviço",
                  price: Number(s.price || s.valor || 0),
                  unitId: unitId,
                  source: "bemp:listServices"
                }))
              }, traceId);
              return;
            }
          } catch (err) {
            console.error("[PRICE_LOOKUP_ERROR]", err);
          }
        } else {
          // Se não tem serviço, perguntar qual serviço
          const response = `Claro 💜 De qual serviço você gostaria de saber o valor?`;
          const nextCtx = { ...bookingContext };
          await patchCustomerContext(finalKey, { bookingContext: nextCtx });
          const { replyWithAI } = await import("./reply.server");
          await replyWithAI({
            instance, phone: contactPhone, text: response, conversationKey: finalKey, messageId, unitId: agent.unidade_id, _trace: trace
          }, traceId);
          return;
        }
      }
    }

    // BEMP proativo - usa o termo CANÔNICO normalizado (ex.: "Mao" -> "manicure")
    const serviceSearchSource: string = extracted?.serviceText || text;
    // Requisito 10: Garantir que a extração de data/período da mensagem atual seja mesclada corretamente
    // mergeBookingContext(previousContext, extracted) já foi chamado acima e resultou em bookingContext.
    

    if (!bookingContext.serviceId && agent?.unidade_id && serviceSearchSource.length >= 3 && serviceSearchSource.length < 50) {
      const { normalizeServiceSearchText } = await import("@/lib/service-utils");
      const normalizedText = normalizeServiceSearchText(serviceSearchSource);
      if (normalizedText && normalizedText.length >= 3) {
        trace?.record("BEMP_SERVICE_LOOKUP_STARTED");
        const { BempService } = await import("@/lib/bemp-service.server");
        try {
          const services = await BempService.listServices(agent.unidade_id);
          const matches = services.filter((s: any) => {
            const sName = normalizeServiceSearchText(s.name || s.nome || "");
            if (!sName) return false;
            return (
              sName === normalizedText ||
              sName.includes(normalizedText) ||
              (normalizedText.includes(sName) && sName.length > 3)
            );
          });
          const exact = matches.find((s: any) => normalizeServiceSearchText(s.name || s.nome || "") === normalizedText);
          const found = exact ?? (matches.length === 1 ? matches[0] : null);
          if (found) {
            bookingContext.serviceId = String(found.id);
            bookingContext.serviceName = String(found.name || (found as any).nome);
            trace?.record("BEMP_SERVICE_LOOKUP_COMPLETED", { found: bookingContext.serviceName });
          } else if (matches.length > 1) {
            bookingContext.candidates = matches.slice(0, 5).map((m: any) => ({
              id: String(m.id),
              name: String(m.name || m.nome),
              price: m.price ?? m.valor ?? 0,
            }));
            bookingContext.clarificationRequired = true;
            trace?.record("BEMP_SERVICE_LOOKUP_COMPLETED", { candidates: bookingContext.candidates.length });
          } else {
            trace?.record("BEMP_SERVICE_LOOKUP_COMPLETED", { found: null });
          }

        } catch (err) {}
      }
    }

    // Segurança: intenção canônica reconhecida (ex.: "Mão" -> manicure) nunca deve
    // fazer o fluxo repetir a pergunta de serviço.
    if (!bookingContext.serviceId && !bookingContext.serviceName && bookingContext.serviceText && !bookingContext.clarificationRequired) {
      bookingContext.serviceName = String(bookingContext.serviceText);
    }



    // SELEÇÃO DE PROFISSIONAL (turno seguinte à pergunta NEED_PROFESSIONAL)
    if (!bookingContext.professionalId && bookingContext.professionalOptions?.length) {
      const { matchProfessionalChoice, isAnyProfessionalChoice, isAnyProfessionalIndex } = await import("@/lib/booking/context");
      if (isAnyProfessionalChoice(text) || isAnyProfessionalIndex(text, bookingContext.professionalOptions)) {
        bookingContext.professionalPreference = "ANY";
        trace?.record("PROFESSIONAL_PREFERENCE_ANY");
      } else {
        const chosen = matchProfessionalChoice(text, bookingContext.professionalOptions);
        if (chosen) {
          bookingContext.professionalId = String(chosen.id);
          bookingContext.professionalName = String(chosen.name);
          trace?.record("PROFESSIONAL_SELECTED", { professionalId: chosen.id, professionalName: chosen.name });
        }
      }
    }

    const explicitSubscription = detectSubscriptionIntent(text);
    if (explicitSubscription) bookingContext.subscriptionIntent = true;

    // ============================================================
    // FLOW CONTROL - Próximo passo (Requisito 5, 6, 7 e 8)
    // ============================================================
    
    const nextSlot = nextRequiredSlot(bookingContext);
    trace?.record("NEXT_SLOT_DETERMINED", { nextSlot, context: bookingContext });

    // Se o próximo passo for profissional, precisamos listar os profissionais.
    if (nextSlot === "professional") {
      const { BempService } = await import("@/lib/bemp-service.server");
      const { buildProfessionalQuestion } = await import("@/lib/booking/lifecycle");
      
      const professionals = await BempService.listProfessionals(bookingContext.unitId || agent.unidade_id, bookingContext.serviceId || "");
      
      if (professionals.length > 0) {
        // Salva as opções para o match no próximo turno
        bookingContext.professionalOptions = professionals.map(p => ({ id: String(p.id), name: p.name }));
        await patchCustomerContext(finalKey, { bookingContext });

        const question = buildProfessionalQuestion(bookingContext.professionalOptions);
        const { replyWithAI } = await import("./reply.server");
        
        await replyWithAI({
          instance,
          phone: contactPhone,
          text: question,
          conversationKey: finalKey,
          messageId,
          unitId: agent.unidade_id,
          _trace: trace
        }, traceId);

        return;
      }
    }

    // SAUDAÇÃO GENÉRICA: nunca continuar booking antigo automaticamente
    const greetingOnly = isGenericGreeting(text);
    if (greetingOnly) {
      const cleaned = clearTransientBooking(bookingContext);
      Object.assign(bookingContext, cleaned);
      trace?.record("STALE_BOOKING_CONTEXT_CLEARED", { reason: "generic_greeting" });
      await patchCustomerContext(finalKey, { bookingContext });
    }

    // MÁQUINA DE ESTADOS DETERMINÍSTICA - CONFIRMAÇÃO
    const confirmableStatus =
      bookingContext.appointmentStatus === "AWAITING_CONFIRMATION" ||
      (bookingContext.appointmentStatus === "FAILED" && !!bookingContext.selectedSlot);
    if (confirmableStatus && isShortAffirmative(text)) {
      bookingContext.customerConfirmed = true;
      bookingContext.awaitingConfirmation = false;
      bookingContext.appointmentStatus = "CREATING";
      trace?.record("BOOKING_CUSTOMER_CONFIRMED", {
        confirmationDetected: true,
        stateBefore: bookingContext.appointmentStatus,
      });
    }

    // MÁQUINA DE ESTADOS DETERMINÍSTICA - SELEÇÃO DE HORÁRIO
    let slotJustSelected = false;
    
    // Se a extração aprimorada em extractBookingSlots já preencheu selectedSlot nesta mensagem
    if (extracted?.selectedSlot) {
      bookingContext.selectedSlot = extracted.selectedSlot;
      const { slotLocalTime } = await import("@/lib/booking/slot-time");
      bookingContext.time = slotLocalTime(extracted.selectedSlot) || bookingContext.time;
      slotJustSelected = true;
    } 
    
    if (!slotJustSelected && !greetingOnly && bookingContext.availableSlots?.length && !bookingContext.selectedSlot) {
      const { slotLocalTime, filterSlotsByLocalDate } = await import("@/lib/booking/slot-time");
      const dateScopedSlots = filterSlotsByLocalDate(bookingContext.availableSlots, bookingContext.date);
      
      const selected = dateScopedSlots.find(s => {
        const hhmm = slotLocalTime(s);
        if (!hhmm) return false;
        if (bookingContext.time === hhmm) return true;
        return text.toLowerCase().includes(hhmm);
      });

      if (selected) {
        bookingContext.selectedSlot = selected;
        bookingContext.time = slotLocalTime(selected) || bookingContext.time || null;
        slotJustSelected = true;
      }
    }

    if (slotJustSelected) {
      bookingContext.appointmentStatus = "AWAITING_CONFIRMATION";
      bookingContext.awaitingConfirmation = true;
      bookingContext.customerConfirmed = false;
      trace?.record("BOOKING_SLOT_SELECTED", { slot: bookingContext.selectedSlot, time: bookingContext.time });
    }


    if (agent.unidade_id) bookingContext.unitId = String(agent.unidade_id);

    // TRANSIÇÃO DETERMINÍSTICA: slot selecionado -> pedido de confirmação (nunca silencioso)
    const confirmationKey = `${bookingContext.date ?? ""}T${bookingContext.time ?? ""}`;
    const alreadySent = (bookingContext as any).confirmationSentFor === confirmationKey;
    
    if ((slotJustSelected || bookingContext.selectedSlot) && !alreadySent && bookingContext.appointmentStatus === "AWAITING_CONFIRMATION") {
      (bookingContext as any).confirmationSentFor = confirmationKey;
      const { buildConfirmationMessage } = await import("@/lib/booking/lifecycle");
      const confirmText = buildConfirmationMessage(bookingContext);
      
      trace?.record("CONFIRMATION_MESSAGE_PREPARED", { confirmationKey, textSnippet: confirmText.slice(0, 50) });
      
      await patchCustomerContext(finalKey, { bookingContext });

      const { replyWithAI } = await import("./reply.server");
      await replyWithAI({
        instance,
        phone: contactPhone,
        text: confirmText,
        conversationKey: finalKey,
        messageId,
        unitId: agent.unidade_id,
        _trace: trace
      }, traceId);

      trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "confirmation_requested" });
      return;
    }



    // AGUARDANDO CONFIRMAÇÃO: qualquer mensagem não afirmativa (ex.: "?") recebe lembrete
    if (
      !greetingOnly &&
      bookingContext.appointmentStatus === "AWAITING_CONFIRMATION" &&
      bookingContext.customerConfirmed !== true &&
      bookingContext.selectedSlot &&
      !isShortAffirmative(text)
    ) {
      const { buildPendingConfirmationReminder } = await import("@/lib/booking/lifecycle");
      await patchCustomerContext(finalKey, { bookingContext });

      const { replyWithAI } = await import("./reply.server");
      await replyWithAI({
        instance,
        phone: contactPhone,
        text: buildPendingConfirmationReminder(bookingContext),
        conversationKey: finalKey,
        messageId,
        unitId: agent.unidade_id,
        _trace: trace
      }, traceId);

      trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "confirmation_reminder" });
      return;
    }

    // CRIAÇÃO DETERMINÍSTICA PÓS CONFIRMAÇÃO
    if (bookingContext.customerConfirmed === true && bookingContext.appointmentStatus === "CREATING") {
       trace?.record("BOOKING_CREATE_STARTED", { function: "BempService.createAppointment" });
       const { BempService, extractBempAppointmentId } = await import("@/lib/bemp-service.server");
       
       // IDEMPOTÊNCIA: um "Sim" cria no máximo UM agendamento
       const idempotencyKey = `${finalKey}:${bookingContext.serviceId}:${bookingContext.selectedSlot || bookingContext.time}`;
       const { replyWithAI } = await import("./reply.server");
       const { formatBookingDate } = await import("@/lib/booking/lifecycle");
       const { clearTransientBooking } = await import("@/lib/booking/context");
       const { claimResponseSlot } = await import("./reply.server");


       if (bookingContext.appointmentId) {
         trace?.record("BOOKING_CREATE_SKIPPED_DUPLICATE", { idempotencyKey });
          const existingMsg = `Agendamento confirmado! 💜\n\nServiço: ${bookingContext.serviceName}\nData: ${formatBookingDate(bookingContext.date)}\nHorário: ${bookingContext.time}\n\nTe esperamos!`;
          await replyWithAI({
            instance,
            phone: contactPhone,
            text: existingMsg,
            conversationKey: finalKey,
            messageId,
            unitId: agent.unidade_id,
            _trace: trace,
          }, traceId);
         await patchCustomerContext(finalKey, { bookingContext });
          trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "existing_booking_confirmed" });
         return;
       }
       if ((bookingContext as any).createBookingKey === idempotencyKey) {
         trace?.record("BOOKING_CREATE_SKIPPED_DUPLICATE", { idempotencyKey, pending: true });
         await replyWithAI({
           instance,
           phone: contactPhone,
           text: "Seu agendamento já está sendo processado. 💜 Vou manter apenas uma solicitação.",
           conversationKey: finalKey,
           messageId,
           unitId: agent.unidade_id,
           _trace: trace,
         }, traceId);
         trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "duplicate_booking_pending" });
         return;
       }
       (bookingContext as any).createBookingKey = idempotencyKey;
       await patchCustomerContext(finalKey, { bookingContext });

       // DATA ABSOLUTA IMUTÁVEL: usa SOMENTE bookingContext.date (nunca recalcula "amanhã").
       const { resolveCreateDateTime } = await import("@/lib/booking/create-guard");
       const createDate = resolveCreateDateTime(bookingContext);
       trace?.record("BOOKING_CREATE_DATE_RESOLVED", {
         contextDate: bookingContext.date,
         resolvedDate: createDate.date,
         time: createDate.time,
         start: createDate.start,
         mismatch: createDate.mismatch,
       });

       if (createDate.mismatch) {
         trace?.record("DATE_SLOT_MISMATCH", { date: bookingContext.date, slot: bookingContext.selectedSlot });
         bookingContext.selectedSlot = null;
         bookingContext.selectedSlotEnd = null;
         bookingContext.availableSlots = [];
         bookingContext.time = null;
         bookingContext.customerConfirmed = false;
         bookingContext.awaitingConfirmation = false;
         bookingContext.appointmentStatus = "NONE";
         (bookingContext as any).createBookingKey = null;
         (bookingContext as any).confirmationSentFor = null;
         await patchCustomerContext(finalKey, { bookingContext });
         await replyWithAI({
           instance,
           phone: contactPhone,
           text: `Preciso reconfirmar os horários para ${formatBookingDate(bookingContext.date)}. 💜 Você prefere manhã, tarde ou noite?`,
           conversationKey: finalKey,
           messageId,
           unitId: agent.unidade_id,
           _trace: trace,
         }, traceId);
         trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "blocked", reason: "date_slot_mismatch" });
         return;
       }

       // BEMP exige professional_id válido em /whatsapp_schedule.
       // Resolve determinístico: profissional disponível para o slot escolhido.
       if (!bookingContext.professionalId && bookingContext.unitId && bookingContext.serviceId) {
         try {
           const { slotLocalTime } = await import("@/lib/booking/slot-time");
           const professionals = await BempService.listProfessionals(bookingContext.unitId, bookingContext.serviceId);
           const wantedTime = bookingContext.time;
           const slotDate = createDate.date;
           for (const p of professionals) {
             const pid = p?.id ?? p?.professional_id;
             if (!pid) continue;
             try {
               const pSlots = await BempService.listAvailableSlots({
                 salonId: bookingContext.unitId,
                 serviceId: bookingContext.serviceId,
                 professionalId: pid,
                 date: String(slotDate),
               });
               const match = pSlots.find((s: any) => slotLocalTime(s) === wantedTime);
               if (match) {
                 bookingContext.professionalId = String(pid);
                 if (typeof match === "object" && (match as any)?.end) {
                   bookingContext.selectedSlotEnd = (match as any).end;
                 }
                 break;
               }
             } catch {}
           }
           trace?.record("BOOKING_PROFESSIONAL_RESOLVED", { professionalId: bookingContext.professionalId });
         } catch (profErr: any) {
           trace?.record("BOOKING_PROFESSIONAL_RESOLVE_FAILED", { error: profErr?.message });
         }
       }

       let createFailed = false;
       try {
          if (!bookingContext.professionalId) {
            throw new Error("BEMP_CONTRACT_INVALID: no professional available for selected slot");
          }
          const createRequest = {
           salon_id: Number(bookingContext.unitId),
           service_id: Number(bookingContext.serviceId),
            professional_id: Number(bookingContext.professionalId),
           start: createDate.start!,
           end: bookingContext.selectedSlotEnd || undefined,
           name: (msg as any).pushName || conv?.contact_name || "Cliente",
           phone_country_code: "55",
           phone_area_code: contactPhone.slice(0, 2),
           phone_number: contactPhone.slice(2),
          };
          trace?.record("BOOKING_CREATE_REQUEST_BUILT", {
            endpoint: "/webhooks/whatsapp_schedule",
            method: "POST",
            salonId: createRequest.salon_id,
            serviceId: createRequest.service_id,
            professionalId: createRequest.professional_id,
            start: createRequest.start,
            end: createRequest.end,
          });
          const result = await BempService.createAppointment(createRequest);
          trace?.record("BOOKING_CREATE_RESPONSE_RECEIVED", { httpStatus: 200, hasResponse: Boolean(result) });

         const apptId = extractBempAppointmentId(result);
         if (apptId) {
           bookingContext.appointmentId = String(apptId);
            bookingContext.appointmentStatus = "CONFIRMED";
            trace?.record("BOOKING_CREATE_SUCCESS", { appointmentId: apptId });
            
            // PONTO DE SINCRONIZAÇÃO: Antes de enviar a resposta final, marcamos que o agendamento foi CONCLUÍDO.
            // Isso previne que qualquer re-processamento da mensagem "Sim" tente criar novamente
            // ou enviar confirmações duplicadas.
            const cleared = clearTransientBooking(bookingContext);
            Object.assign(bookingContext, cleared, {
              appointmentStatus: "CONFIRMED",
              appointmentId: String(apptId),
              customerConfirmed: false,
              awaitingConfirmation: false,
              selectedSlot: null,
              time: null,
            });
            (bookingContext as any).createBookingKey = null;
            (bookingContext as any).confirmationSentFor = null;

            await patchCustomerContext(finalKey, { 
              bookingContext,
              appointment_confirmed_at: new Date().toISOString()
            });

            // Resposta Final Obrigatória
             const finalMsg = `Agendamento confirmado! 💜\n\nServiço: ${bookingContext.serviceName}\nData: ${formatBookingDate(bookingContext.date)}\nHorário: ${bookingContext.time}\n\nTe esperamos!`;


            await replyWithAI({
              instance,
              phone: contactPhone,
              text: finalMsg,
              conversationKey: finalKey,
              messageId,
              unitId: agent.unidade_id,
              _trace: trace
            }, traceId);

            // Limpeza atômica e terminal: o agendamento foi concluído.
            // Transição para CONFIRMED reseta os seletores para não repetir confirmações.
            const cleared = clearTransientBooking(bookingContext);
            Object.assign(bookingContext, cleared, {
              appointmentStatus: "CONFIRMED",
              appointmentId: String(apptId),
              customerConfirmed: false,
              awaitingConfirmation: false,
              selectedSlot: null,
              time: null,
            });
            (bookingContext as any).createBookingKey = null;
            (bookingContext as any).confirmationSentFor = null;

            await patchCustomerContext(finalKey, { 
              bookingContext,
              appointment_confirmed_at: new Date().toISOString()
            });
            trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "booking_confirmed" });
            return;
         } else {
           createFailed = true;
           trace?.record("BOOKING_CREATE_FAILED", { error: "No ID returned" });
         }
       } catch (err: any) {
         createFailed = true;
          trace?.record("BOOKING_CREATE_FAILED", {
            endpoint: "/webhooks/whatsapp_schedule",
            method: "POST",
            httpStatus: err?.statusCode ?? err?.status ?? null,
            errorCode: err?.code ?? null,
            errorMessage: err?.message,
          });
       }

       // NUNCA silencioso: falha real recebe resposta segura
       if (createFailed) {
         bookingContext.appointmentStatus = "FAILED";
         bookingContext.customerConfirmed = false;
         bookingContext.awaitingConfirmation = true;
         (bookingContext as any).createBookingKey = null;
         await patchCustomerContext(finalKey, { bookingContext });

         await replyWithAI({
           instance,
           phone: contactPhone,
           text: "Não consegui concluir seu agendamento agora. 💜 Vou precisar tentar novamente em instantes.",
           conversationKey: finalKey,
           messageId,
           unitId: agent.unidade_id,
           _trace: trace
         }, traceId);

         trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "error", reason: "booking_create_failed" });
         return;
       }
    }


    trace?.record("BOOKING_CONTEXT_MERGED");

    let requiredSlot = nextRequiredSlot(bookingContext);
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

      const { replyWithAI } = await import("./reply.server");
      await replyWithAI({
        instance,
        phone: contactPhone,
        text: referralText,
        conversationKey: finalKey,
        messageId,
        unitId: agent.unidade_id,
        _trace: trace
      }, traceId);

      trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "boulevard_referral" });
      return;
    }

    // ESTADO NEED_PROFESSIONAL: perguntar o profissional ANTES do período/horários.
    // BUG FIX: Se o próximo passo for profissional mas acabamos de selecioná-lo (PROFESSIONAL_SELECTED),
    // devemos recalcular o requiredSlot AGORA para evitar repetir a pergunta.
    if (requiredSlot === "professional" && bookingContext.professionalId) {
      requiredSlot = nextRequiredSlot(bookingContext);
      trace?.record("NEXT_REQUIRED_SLOT_RECALCULATED", { slot: requiredSlot });
    }

    if (!greetingOnly && requiredSlot === "professional" && bookingContext.unitId && bookingContext.serviceId) {
      trace?.record("NEED_PROFESSIONAL", { serviceId: bookingContext.serviceId, date: bookingContext.date });
      const { BempService } = await import("@/lib/bemp-service.server");
      const { buildProfessionalQuestion } = await import("@/lib/booking/lifecycle");
      let options: Array<{ id: string; name: string }> = [];
      try {
        const professionals = await BempService.listProfessionals(bookingContext.unitId, bookingContext.serviceId);
        options = (professionals || [])
          .map((p: any) => ({
            id: String(p?.id ?? p?.professional_id ?? p?.employee_id ?? ""),
            name: String(p?.name ?? p?.nome ?? p?.full_name ?? p?.professional_name ?? "").trim(),
          }))
          .filter((p) => p.id && p.name);
        trace?.record("BEMP_PROFESSIONALS_LOADED", { count: options.length });
      } catch (profErr: any) {
        trace?.record("BEMP_PROFESSIONALS_FAILED", { error: profErr?.message });
      }

      if (options.length === 0) {
        // Sem profissionais reais retornados: seguir com disponibilidade geral.
        bookingContext.professionalPreference = "ANY";
        bookingContext.professionalOptions = undefined;
        requiredSlot = nextRequiredSlot(bookingContext);
        await patchCustomerContext(finalKey, { bookingContext });
      } else {
        bookingContext.professionalOptions = options;
        await patchCustomerContext(finalKey, { bookingContext });

        const { replyWithAI } = await import("./reply.server");
        await replyWithAI({
          instance,
          phone: contactPhone,
          text: buildProfessionalQuestion(options),
          conversationKey: finalKey,
          messageId,
          unitId: agent.unidade_id,
          _trace: trace,
        }, traceId);

        trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "professional_question_sent" });
        return;
      }
    }


    // REQUISITO 5: Fluxo Determinístico sem Gemini para perguntas estruturais
    const { getDeterministicResponse } = await import("@/lib/booking/lifecycle");
    
    // MÁQUINA DE ESTADOS: Se period está preenchido mas disponibilidade ainda é necessária,
    // disparar list_slots automaticamente.
    const { hasCurrentSessionPeriod } = await import("@/lib/booking/context");
    if (!greetingOnly && requiredSlot === "availability" && hasCurrentSessionPeriod(bookingContext) && !bookingContext.time && !bookingContext.selectedSlot) {
      trace?.record("AUTO_LIST_SLOTS_TRIGGERED", { period: bookingContext.period });
      
      const { BempService } = await import("@/lib/bemp-service.server");
      try {
        const slots = await BempService.listAvailableSlots({
          salonId: Number(bookingContext.unitId),
          serviceId: Number(bookingContext.serviceId),
          professionalId: bookingContext.professionalId ? String(bookingContext.professionalId) : undefined,
          date: bookingContext.date!,
        });

        const { filterSlotsByPeriod, formatSlotsForDisplay, slotStart, filterSlotsByLocalDate } = await import("@/lib/booking/slot-time");
        const sameDay = filterSlotsByLocalDate(slots as any[], bookingContext.date);
        const filtered = filterSlotsByPeriod(sameDay, bookingContext.period);

        if (filtered.length > 0) {
          // Preserva o slot REAL (ISO completo) internamente
          const availableTimes = filtered.map((s: any) => slotStart(s) || String(s));
          bookingContext.availableSlots = availableTimes;
          await patchCustomerContext(finalKey, { bookingContext });

          // Apresentação: somente HH:mm
          const slotsText = formatSlotsForDisplay(availableTimes, 10).join("\n");
          const responseText = `Encontrei estes horários para ${bookingContext.period}:\n\n${slotsText}\n\nQual deles fica melhor para você? 💜`;
          
          const { replyWithAI } = await import("./reply.server");
          await replyWithAI({
            instance,
            phone: contactPhone,
            text: responseText,
            conversationKey: finalKey,
            messageId,
            unitId: agent.unidade_id,
            _trace: trace
          }, traceId);

          trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "auto_slots_sent" });
          return;
        } else {
          const { replyWithAI } = await import("./reply.server");
          await replyWithAI({
            instance,
            phone: contactPhone,
            text: `Infelizmente não encontrei horários disponíveis para ${bookingContext.period} nesta data. 😔 Gostaria de tentar outro período ou outro dia?`,
            conversationKey: finalKey,
            messageId,
            unitId: agent.unidade_id,
            _trace: trace
          }, traceId);
          
          trace?.record("TOTAL_PROCESSING_COMPLETED", { reason: "no_slots_found" });
          return;
        }
      } catch (err: any) {
        logger.error("AUTO_LIST_SLOTS_FAILED", err.message);
      }
    }

    const detResponse = getDeterministicResponse(bookingContext);
    
    if (detResponse) {
      const { replyWithAI } = await import("./reply.server");
      trace?.record("DETERMINISTIC_RESPONSE_SENT", { slot: nextRequiredSlot(bookingContext) });
      
      await replyWithAI({
        instance,
        phone: contactPhone,
        text: detResponse,
        conversationKey: finalKey,
        messageId,
        unitId: agent.unidade_id,
        _trace: trace
      }, traceId);

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
      
      // Requisito 2: Resposta vazia da IA deve gerar um fallback determinístico para não deixar o cliente no vácuo
      logger.error("AI_EMPTY_RESPONSE", "A IA retornou uma resposta vazia", { traceId, instance, conversationKey: finalKey });
      
      const { getFallbackResponse } = await import("@/lib/booking/lifecycle");
      const fallbackReply = getFallbackResponse(bookingContext);
      
      const { replyWithAI } = await import("./reply.server");
      await replyWithAI({
        instance,
        phone: contactPhone,
        text: fallbackReply,
        conversationKey: finalKey,
        messageId,
        unitId: agent.unidade_id,
        _trace: trace
      }, traceId);

      trace?.record("TOTAL_PROCESSING_COMPLETED", { status: "success", reason: "ai_empty_response_fallback" });
      return;
    }


    // Proteção contra perguntas duplicadas
    const { text: cleanReply, blocked: questionBlocked } = ensureNoDuplicateBookingQuestion(replyText, bookingContext);
    if (questionBlocked) {
      trace?.record("DUPLICATE_BOOKING_QUESTION_BLOCKED", { original: replyText, clean: cleanReply });
    }

    const { replyWithAI } = await import("./reply.server");
    await replyWithAI({
      instance,
      phone: contactPhone,
      text: cleanReply,
      conversationKey: finalKey,
      messageId,
      unitId: agent.unidade_id,
      _trace: trace
    }, traceId);

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
