import { normalizeEvolutionMessages } from "./message-normalizer";
import { claimEvent } from "./idempotency.server";
import { updateConversationMetadata } from "./conversation.server";
import { runAgentFlow, findAgentByInstance, isIAEnabled } from "./agent.server";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey, normalizeContactName, resolveCustomerIdentity } from "./contact";
import { logger } from "@/lib/observability/logger.server";
import { PerformanceTrace } from "./performance.server";

/** Normalização estrita: só valores explicitamente verdadeiros contam como fromMe. */
export function isFromMe(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "1";
}

/**
 * Orquestrador principal para eventos de mensagens (messages.upsert)
 */
export async function processMessagesUpsert(payload: any, requestUrl: string) {
  const instance = payload.instance || payload.instanceName || "unknown";

  // 1. Normalização (Rápida)
  const messages = normalizeEvolutionMessages(payload, requestUrl);

  if (messages.length === 0) {
    logger.info("WEBHOOK_FILTERED", "Webhook ignorado: nenhuma mensagem válida no array", { instance });
    return;
  }


  // Pre-load common imports for all messages in the loop
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { markEventProcessed, markEventFailed } = await import("./idempotency.server");
  const { normalizeIncomingMessage } = await import("./media-normalizer");
  const { mediaPlaceholderText } = await import("./media-pipeline.server");
  const { appendIncomingMessage } = await import("./conversation.server");

  for (const msg of messages) {
    const traceId = (payload as any)._traceId || `trace-${msg.instance}-${msg.messageId}`;
    
    // Iniciar Trace de Performance
    const trace = new PerformanceTrace({
      traceId,
      inboundMessageId: msg.messageId,
      instanceId: msg.instance,
      phoneLast4: normalizePhone(msg.remoteJidAlt || msg.remoteJid).slice(-4)
    });

    trace.record("WEBHOOK_RECEIVED");

    try {
      // 2. fromMe (mensagem enviada pelo próprio número) → diferenciar IA vs Humano
      if (isFromMe(msg.fromMe)) {
        trace.record("MESSAGE_PARSED", { direction: "OUTBOUND_ECHO" });
        const outboundText = extractMessageText(msg.message)?.trim() || "";
        const outboundIdentity = resolveCustomerIdentity(msg);
        const outboundConversationKey = buildConversationKey(msg.instance, outboundIdentity.phone);
        
        // O webhook de eco pode chegar antes de sendEvolutionText persistir o ID.
        // Faz uma segunda leitura curta e, por último, correlaciona o texto com a
        // resposta assistant já salva na conversa para não confundir a Julia com humano.
        let aiMessage: { message_id?: string } | null = null;
        for (let attempt = 0; attempt < 2 && !aiMessage; attempt += 1) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500));
          const { data } = await supabaseAdmin
            .from("ai_sent_messages")
            .select("message_id")
            .eq("instance", msg.instance)
            .eq("message_id", msg.messageId)
            .maybeSingle();
          aiMessage = data as { message_id?: string } | null;
        }

        if (!aiMessage && outboundText) {
          const { data: outboundConversation } = await supabaseAdmin
            .from("wa_conversas")
            .select("messages")
            .eq("phone", outboundConversationKey)
            .maybeSingle();
          const history = Array.isArray(outboundConversation?.messages)
            ? outboundConversation.messages
            : [];
          const matchesRecentAssistant = history.slice(-6).some((item: any) => {
            if (item?.role !== "assistant" || !Array.isArray(item.parts)) return false;
            const savedText = item.parts
              .filter((part: any) => part?.type === "text")
              .map((part: any) => String(part.text || ""))
              .join("\n")
              .trim();
            return savedText === outboundText;
          });

          if (matchesRecentAssistant) {
            aiMessage = { message_id: msg.messageId };
            await supabaseAdmin.from("ai_sent_messages").upsert({
              instance: msg.instance,
              message_id: msg.messageId,
              phone: outboundIdentity.phone,
              sent_at: new Date().toISOString(),
            }, { onConflict: "instance,message_id" });
          }
        }

        // Fallback seguro por fingerprint: a Evolution pode devolver o eco com
        // um messageId diferente do retornado no envio. Nesse caso comparamos
        // instância + telefone normalizado + janela curta + texto normalizado
        // contra o FOLLOWUP_EVOLUTION_REQUEST anterior.
        if (!aiMessage && outboundText) {
          const { findEchoFingerprintMatch, ECHO_FINGERPRINT_WINDOW_MS } = await import("./echo-fingerprint");
          const since = new Date(Date.now() - ECHO_FINGERPRINT_WINDOW_MS).toISOString();
          const { data: outboundLogs } = await supabaseAdmin
            .from("evo_webhook_logs")
            .select("created_at, payload")
            .eq("instance", msg.instance)
            .eq("event", "FOLLOWUP_EVOLUTION_REQUEST")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(20);

          const echoMatch = findEchoFingerprintMatch({
            outboundText,
            phone: outboundIdentity.phone,
            logs: (outboundLogs as any[]) || [],
          });

          if (echoMatch) {
            aiMessage = { message_id: msg.messageId };
            trace.record("AI_ECHO_CORRELATED_BY_FINGERPRINT", {
              instance: msg.instance,
              phoneLast4: outboundIdentity.phone.slice(-4),
            });
            await logEvent({
              instance: msg.instance,
              messageId: msg.messageId,
              event: "AI_ECHO_CORRELATED_BY_FINGERPRINT",
              status: "success",
              payload: { traceId, conversationKey: outboundConversationKey },
            });
            await supabaseAdmin.from("ai_sent_messages").upsert({
              instance: msg.instance,
              message_id: msg.messageId,
              phone: outboundIdentity.phone,
              sent_at: new Date().toISOString(),
            }, { onConflict: "instance,message_id" });
          }
        }

        if (aiMessage) {
          trace.record("MESSAGE_PROCESSING_ABORTED", { stage: "OUTBOUND_CHECK", reason: "ai_echo_ignored", traceId });
          trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "ai_echo_ignored" });
          continue; 
        }


        // Ignorar se for mensagem de status/broadcast enviada por mim
        if (msg.remoteJid.includes("@broadcast") || msg.remoteJid === "status@broadcast") {
          trace.record("MESSAGE_PROCESSING_ABORTED", { stage: "OUTBOUND_CHECK", reason: "status_broadcast_echo", traceId });
          continue;
        }

        // Eventos de sincronização/ack sem conteúdo não representam uma resposta humana.
        if (!outboundText) {
          trace.record("MESSAGE_PROCESSING_ABORTED", { stage: "OUTBOUND_CHECK", reason: "empty_outbound_event", traceId });
          trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "empty_outbound_event" });
          continue;
        }


        // fromMe=true mas NÃO foi a IA -> HUMANO assumiu
        const phone = outboundIdentity.phone;
        const conversationKey = outboundConversationKey;

        trace.record("CONVERSATION_LOOKUP_STARTED", { conversationKey });
        const { error: updateError } = await supabaseAdmin
          .from("wa_conversas")
          .update({ 
            attendance_mode: "HUMAN", 
            human_takeover_at: new Date().toISOString(),
            human_takeover_detected: true,
            ai_paused_at: new Date().toISOString(),
            ai_pause_reason: "HUMAN_AGENT_REPLIED",
            last_human_message_at: new Date().toISOString()
          })
          .eq("phone", conversationKey);
        
        trace.record("CONVERSATION_LOOKUP_COMPLETED", { updatedToHuman: !updateError });

        if (updateError) {
          console.error("[takeover] Error updating to HUMAN mode:", updateError);
        }

        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "HUMAN_MESSAGE_DETECTED",
          status: "attendance_mode_set_to_human",
          payload: { traceId, phone, conversationKey, remoteJid: msg.remoteJid, fromMe: msg.fromMe }
        });
        
        trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "human_takeover_processed" });
        continue;
      }

      const text = extractMessageText(msg.message);
      
      // 3. Resolução de Identidade (NOVO)
      const identity = resolveCustomerIdentity(msg);
      const phone = identity.phone;
      const conversationKey = buildConversationKey(msg.instance, identity.phone);

      console.log(`[WHATSAPP_IDENTITY_RESOLVED]
instance: ${msg.instance}
remoteJid: ${msg.remoteJid}
remoteJidAlt: ${msg.remoteJidAlt || "none"}
phone: ${identity.phone}
lid: ${identity.lid || "none"}
source: ${identity.identitySource}`);

      trace.record("MESSAGE_PARSED", { 
        textSnippet: text?.slice(0, 30),
        identitySource: identity.identitySource,
        isLid: !!identity.lid
      });

      // Ignorar grupos, transmissões e status (Removido @lid do descarte automático)
      if (msg.remoteJid.includes("@g.us") || msg.remoteJid.includes("@broadcast") || msg.remoteJid === "status@broadcast") {
        const reason = msg.remoteJid.includes("@g.us") ? "group_message" : 
                      msg.remoteJid.includes("@broadcast") ? "broadcast_message" : "status_update";
                       
        trace.record("MESSAGE_IGNORED", { reason, remoteJid: msg.remoteJid });
        trace.record("TOTAL_PROCESSING_COMPLETED", { reason });
        continue;
      }

      if (msg.remoteJid.includes("@lid")) {
        trace.record("LID_MESSAGE_RECEIVED", { 
          remoteJid: msg.remoteJid, 
          resolvedPhone: identity.phone,
          source: identity.identitySource 
        });
        
        if (identity.identitySource === "lid_fallback") {
           // Se não resolveu para um telefone real, ainda assim não descartamos silenciosamente, 
           // mas logamos o aviso de falha de resolução ideal.
           trace.record("LID_PHONE_RESOLUTION_FAILED", { 
             remoteJid: msg.remoteJid,
             payload: JSON.stringify({
               remoteJidAlt: msg.remoteJidAlt,
               participant: msg.participant,
               senderPn: msg.senderPn
             })
           });
        }
      }


      // 3. Idempotência atômica (Rápido via RPC)
      trace.record("IDEMPOTENCY_CHECK_STARTED");
      const { claimed, reason, finalMessageId } = await claimEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        remoteJid: msg.remoteJid,
        phone,
        timestamp: msg.timestamp,
        text: text || "",
        traceId
      });
      
      trace.record("MESSAGE_DUPLICATE_CHECK", { 
        inboundMessageId: msg.messageId,
        duplicate: !claimed,
        source: "evolution_upsert"
      });
      
      trace.record("IDEMPOTENCY_CHECK_COMPLETED", { claimed, reason });

      if (!claimed) {
        if (reason === "already_processed" || reason === "processing") {
          trace.record("DUPLICATE_MESSAGE_SKIPPED", { reason });
        }
        trace.record("MESSAGE_PROCESSING_ABORTED", { 
          stage: "IDEMPOTENCY_CHECK", 
          reason: reason || "duplicate",
          traceId
        });
        trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "not_claimed" });
        continue;
      }


      // 4. Lock por conversa (Rápido via RPC)
      // conversationKey já definido acima na resolução de identidade
      trace.updateContext({ conversationId: conversationKey });
      
      // Otimização: Tentar resolver Agente ANTES do Lock para falhar rápido se não existir
      trace.record("AGENT_LOOKUP_STARTED", { instance: msg.instance });
      const agent = await findAgentByInstance(msg.instance);
      const isIAActive = isIAEnabled(agent);
      trace.record("AGENT_RESOLVED", { agentId: agent?.id, iaEnabled: isIAActive });

    if (!agent) {
      trace.record("INBOUND_INSTANCE_NOT_RESOLVED", { 
        stage: "AGENT_RESOLUTION", 
        reason: "AGENT_NOT_FOUND",
        traceId,
        instance: msg.instance
      });
      console.error(`[INBOUND_INSTANCE_NOT_RESOLVED] Instance received: ${msg.instance}, remoteJid: ${msg.remoteJid}, messageId: ${finalMessageId}`);
      await logEvent({
        instance: msg.instance,
        messageId: finalMessageId,
        event: "INBOUND_INSTANCE_NOT_RESOLVED",
        status: "failed",
        payload: { traceId, instance: msg.instance, remoteJid: msg.remoteJid, phone }
      });
      trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "AGENT_NOT_FOUND" });
      await markEventFailed(msg.instance, finalMessageId, "AGENT_NOT_FOUND");
      continue;
    }


    if (!isIAActive) {
      const status = String(agent.status || "").toLowerCase().trim();
      const reason = !agent.ia_ativa ? "IA_DISABLED_ADMIN" : 
                     !agent.unidade_id ? "NO_UNIT" : 
                     ["desativado", "disabled", "inativo"].includes(status) ? "AGENT_DISABLED" : "IA_INACTIVE_GENERAL";

      trace.record("MESSAGE_PROCESSING_ABORTED", { 
        stage: "AGENT_AI_CHECK", 
        reason,
        traceId,
        instance: msg.instance
      });
      console.info(`[${reason}] Agent found but AI is not active for instance: ${msg.instance}`);
      await logEvent({
        instance: msg.instance,
        messageId: finalMessageId,
        event: reason,
        status: "failed",
        payload: { traceId, instance: msg.instance, phone, agentId: agent.id }
      });
      trace.record("TOTAL_PROCESSING_COMPLETED", { reason });
      await markEventFailed(msg.instance, finalMessageId, reason);
      continue;
    }


      trace.record("CONVERSATION_LOCK_STARTED");
      const { data: lockAcquired, error: lockError } = await supabaseAdmin.rpc("acquire_conversation_lock" as any, {
        p_conversation_key: conversationKey,
        p_trace_id: traceId
      });
      
      trace.record("LOCK_ACQUIRED", { 
        acquired: lockAcquired === true, 
        error: lockError?.message,
        conversationId: conversationKey
      });
      
      trace.record("CONVERSATION_LOCK_COMPLETED", { acquired: lockAcquired === true, error: lockError?.message });


      if (lockError || lockAcquired !== true) {
        // Requisito 5: Se o lock falhar, marcar como erro e lançar exceção para retry
        await markEventFailed(msg.instance, finalMessageId, "conversation_locked_retry");
        trace.record("MESSAGE_PROCESSING_ABORTED", { 
          stage: "CONVERSATION_LOCK", 
          reason: lockError ? "lock_error" : "lock_not_acquired",
          traceId,
          error: lockError?.message
        });
        trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "lock_failed" });
        
        throw new Error(lockError?.message || `CONVERSATION_LOCK_NOT_ACQUIRED: ${conversationKey}`);
      }


      try {
        let isHumanMode = false;
        let unitId: string = agent.unidade_id;
        
        // 5. Agente e Unidade (Pre-resolvido antes do lock)
        trace.record("METADATA_UPDATE_STARTED");
        
        // Non-blocking update
        updateConversationMetadata(conversationKey, {
          agent_id: agent.id,
          unidade_id: unitId,
          contact_name: msg.pushName || undefined
        }).catch(() => {});

        // 6. Persistência e Contexto (Merge e Append)
        trace.record("CONTEXT_LOAD_STARTED");
        const normalized = normalizeIncomingMessage(msg.message, finalMessageId);
        const isMedia = normalized.messageType !== "text";
        const displayText = isMedia ? mediaPlaceholderText(normalized) : text || "[Mídia/Outro]";

        const refreshedConv = await appendIncomingMessage({
          conversationKey,
          messageId: finalMessageId,
          text: displayText,
          instance: msg.instance,
          phone,
          contactName: normalizeContactName(msg.pushName || undefined),
          isIAActive,
          metadata: isMedia ? { mediaReference: `${msg.instance}:${finalMessageId}` } : null,
        });
        trace.record("CONTEXT_LOAD_COMPLETED", { 
          hasRefreshedData: !!refreshedConv,
          historyCount: refreshedConv?.messages?.length || 0 
        });
        
        isHumanMode = refreshedConv?.attendance_mode === "HUMAN" || !!refreshedConv?.ai_paused_at;

        let agentText: string | undefined = text || undefined;

        // 6b. Análise de mídia (se necessário)
        if (isMedia) {
          trace.record("MEDIA_PIPELINE_STARTED", { type: normalized.messageType });
          const { processIncomingMedia } = await import("./media-pipeline.server");
          const outcome = await processIncomingMedia({
            instance: msg.instance,
            messageId: finalMessageId,
            conversationKey,
            normalized,
          });
          agentText = outcome.agentText || undefined;
          trace.record("MEDIA_PIPELINE_COMPLETED", { success: !!agentText });
        }

        // 7. Fluxo da IA
        if (isIAActive && agentText) {
          trace.record("AI_STARTED", { traceId });
          await runAgentFlow(
            {
              ...msg,
              messageId: finalMessageId,
              _trace: trace,
              // Identidade já resolvida (inclusive @lid): a IA deve usar SEMPRE estes valores.
              _resolvedPhone: phone,
              _conversationKey: conversationKey,
            } as any,
            agentText
          );
          trace.record("AI_COMPLETED", { traceId });
        } else {
          trace.record("MESSAGE_PROCESSING_ABORTED", { 
            stage: "AGENT_FLOW", 
            reason: !isIAActive ? "ia_disabled" : "no_text_content",
            traceId,
            iaEnabled: isIAActive,
            hasText: !!agentText
          });
        }


        // Todo evento tratado com sucesso é finalizado como processed —
        // inclusive quando a IA está pausada (modo humano) ou não há texto —
        // para nunca deixar eventos presos em PROCESSING.
        await markEventProcessed(msg.instance, finalMessageId);
        
        trace.record("TOTAL_PROCESSING_COMPLETED", { status: "success", humanMode: isHumanMode });

      } catch (innerError: any) {
        trace.record("TOTAL_PROCESSING_COMPLETED", { status: "error", error: innerError.message });
        await markEventFailed(msg.instance, finalMessageId, innerError.message);
        throw innerError;
      } finally {
        // 8. Liberar lock
        const { error: releaseError } = await supabaseAdmin.rpc("release_conversation_lock" as any, {
          p_conversation_key: conversationKey,
          p_trace_id: traceId
        });
        trace.record("LOCK_RELEASED", { success: !releaseError });

      }
    } catch (error: any) {
      console.error("[evolution] Error processing message", msg.messageId, error);
      // Propagar o erro para o orquestrador (Requisito 2)
      throw error;
    }
  }
}

/**
 * Orquestrador para atualizações de conexão
 */
export async function processConnectionUpdate(payload: any) {
  const instance = payload.instance || payload.instanceName || "unknown";
  const state = payload.data?.status || payload.data?.state || "updated";
  const phoneNumber = payload.data?.number || payload.data?.phone || null;
  
  await logEvent({
    instance,
    event: "connection.update",
    status: state,
    payload: payload.data
  });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Normalização de Status
  let dbStatus = "desconectado";
  if (state === "open" || state === "connected") dbStatus = "conectado";
  else if (state === "connecting") dbStatus = "conectando";
  else if (state === "close" || state === "disconnected") dbStatus = "desconectado";

  const updateData: any = { 
    status_conexao: dbStatus,
    updated_at: new Date().toISOString()
  };
  
  if (phoneNumber) {
    updateData.telefone = phoneNumber;
  }
  
  if (dbStatus === "conectado") {
    updateData.last_connection_at = new Date().toISOString();
  }

  await supabaseAdmin
    .from("wa_agentes" as never)
    .update(updateData as never)
    .eq("instancia", instance);
}