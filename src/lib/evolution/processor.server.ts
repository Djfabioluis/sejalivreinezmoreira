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
        
        // Verifica se é eco da IA (Rápido via Index)
        const { data: aiMessage } = await supabaseAdmin
          .from("ai_sent_messages")
          .select("message_id")
          .eq("instance", msg.instance)
          .eq("message_id", msg.messageId)
          .maybeSingle();

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


        // fromMe=true mas NÃO foi a IA -> HUMANO assumiu
        const phone = normalizePhone(msg.remoteJid);
        const conversationKey = buildConversationKey(msg.instance, msg.remoteJid);

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
      trace.record("INSTANCE_RESOLVED_STARTED");
      const agent = await findAgentByInstance(msg.instance);
      const isIAActive = isIAEnabled(agent);
      trace.record("INSTANCE_RESOLVED_COMPLETED", { agentId: agent?.id, iaEnabled: isIAActive });

      if (!agent) {
        trace.record("MESSAGE_PROCESSING_ABORTED", { 
          stage: "AGENT_RESOLUTION", 
          reason: "agent_not_found",
          traceId,
          instance: msg.instance
        });
        trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "agent_not_found" });
        await markEventProcessed(msg.instance, finalMessageId);
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
        await markEventFailed(msg.instance, finalMessageId, "conversation_locked_retry");
        trace.record("MESSAGE_PROCESSING_ABORTED", { 
          stage: "CONVERSATION_LOCK", 
          reason: lockError ? "lock_error" : "lock_not_acquired",
          traceId,
          error: lockError?.message
        });
        trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "lock_failed" });
        continue;
      }


      try {
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
          trace.record("AGENT_FLOW_STARTED");
          await runAgentFlow(
            { ...msg, messageId: finalMessageId, _trace: trace } as any, 
            agentText
          );
          trace.record("AGENT_FLOW_COMPLETED");
        } else {
          trace.record("MESSAGE_PROCESSING_ABORTED", { 
            stage: "AGENT_FLOW", 
            reason: !isIAActive ? "ia_disabled" : "no_text_content",
            traceId,
            iaEnabled: isIAActive,
            hasText: !!agentText
          });
        }


        await markEventProcessed(msg.instance, finalMessageId);
        trace.record("TOTAL_PROCESSING_COMPLETED", { status: "success" });

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