import { normalizeEvolutionMessages } from "./message-normalizer";
import { claimEvent, markEventProcessed, markEventFailed } from "./idempotency.server";
import { appendIncomingMessage } from "./conversation.server";
import { runAgentFlow, findAgentByInstance, isIAEnabled } from "./agent.server";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizeIncomingMessage } from "./media-normalizer";
import { mediaPlaceholderText } from "./media-pipeline.server";
import { normalizePhone, buildConversationKey, normalizeContactName } from "./contact";
import { logger } from "@/lib/observability/logger.server";

/** Normalização estrita: só valores explicitamente verdadeiros contam como fromMe. */
export function isFromMe(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "1";
}

/**
 * Orquestrador principal para eventos de mensagens (messages.upsert)
 */
export async function processMessagesUpsert(payload: any, requestUrl: string) {
  const instance = payload.instance || payload.instanceName || "unknown";

  // 1. Normalização
  const messages = normalizeEvolutionMessages(payload, requestUrl);

  if (messages.length === 0) {
    await logEvent({
      instance,
      event: "payload_shape_detected",
      status: "no_messages_found",
      payload: {
        event: payload.event,
        data_keys: payload.data ? Object.keys(payload.data) : null,
        payload_keys: Object.keys(payload)
      }
    });
    return;
  }

  for (const msg of messages) {
    const traceId = (payload as any)._traceId || `${msg.instance}:${msg.messageId}`;
    logger.info("MESSAGE_UPSTREAM", `Processando mensagem do WhatsApp [${traceId}]`, { 
      instance: msg.instance, 
      phone: msg.remoteJid 
    });

    try {
      // 2. fromMe (mensagem enviada pelo próprio número) → diferenciar IA vs Humano
      if (isFromMe(msg.fromMe)) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        
        // Verifica se é eco da IA
        const { data: aiMessage } = await supabaseAdmin
          .from("ai_sent_messages")
          .select("message_id")
          .eq("instance", msg.instance)
          .eq("message_id", msg.messageId)
          .maybeSingle();

        if (aiMessage) {
          // Eco da própria IA — ignorar
          await logEvent({
            instance: msg.instance,
            messageId: msg.messageId,
            event: "MESSAGE_IGNORED",
            status: "skipped",
            payload: { 
              traceId,
              reason: "ai_echo"
            }
          });
          continue; 
        }

        // NOVO: LOG DETALHADO PARA DEPURAÇÃO DE TAKEOVER
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "from_me_detected_not_ai",
          status: "processing_takeover",
          payload: { 
            traceId, 
            remoteJid: msg.remoteJid,
            isStatus: msg.remoteJid.includes("@broadcast") || msg.remoteJid === "status@broadcast"
          }
        });

        // Ignorar se for mensagem de status/broadcast enviada por mim
        if (msg.remoteJid.includes("@broadcast") || msg.remoteJid === "status@broadcast") {
          continue;
        }

        // fromMe=true mas NÃO foi a IA -> HUMANO assumiu
        const phone = normalizePhone(msg.remoteJid);
        const conversationKey = buildConversationKey(msg.instance, msg.remoteJid);

        const { error: updateError } = await supabaseAdmin
          .from("wa_conversas")
          .update({ 
            attendance_mode: "HUMAN", 
            human_takeover_at: new Date().toISOString() 
          })
          .or(`phone.eq.${conversationKey},phone.eq.${phone},phone_number.eq.${phone}`);

        if (updateError) {
          console.error("[takeover] Error updating to HUMAN mode:", updateError);
        }

        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "human_takeover_detected",
          status: "attendance_mode_set_to_human",
          payload: { traceId, phone, conversationKey, remoteJid: msg.remoteJid, updateError, fromMe: msg.fromMe }
        });

        // IMPORTANTE: Permitimos continuar para registrar a mensagem no histórico, 
        // mas o runAgentFlow no passo 7 já bloqueia resposta se isFromMe for true.
      } else {
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "INBOUND_DIRECTION",
          status: "success",
          payload: { traceId, direction: "CUSTOMER" }
        });
      }


      const text = extractMessageText(msg.message);
      const phone = normalizePhone(msg.remoteJid);

      // Ignorar grupos, transmissões e status
      if (msg.remoteJid.includes("@g.us") || msg.remoteJid.includes("@broadcast") || msg.remoteJid === "status@broadcast") {
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "MESSAGE_IGNORED",
          status: "skipped",
          payload: { 
            remoteJid: msg.remoteJid, 
            traceId,
            reason: msg.remoteJid.includes("@g.us") ? "group_message" : "broadcast_status"
          }
        });
        continue;
      }

      // 3. Idempotência atômica (instance + messageId), com recuperação de travamentos
      const { claimed, reason, finalMessageId } = await claimEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        remoteJid: msg.remoteJid,
        phone,
        timestamp: msg.timestamp,
        text: text || "",
        traceId
      });

      if (!claimed) {
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "MESSAGE_IGNORED",
          status: "skipped",
          payload: { 
            traceId, 
            reason: reason === "already_processed" ? "duplicate" : reason 
          }
        });
        continue;
      }

      // 4. Lock por conversa (concorrência) — nunca bloqueia definitivamente
      const conversationKey = buildConversationKey(msg.instance, msg.remoteJid);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: lockAcquired, error: lockError } = await supabaseAdmin.rpc("acquire_conversation_lock" as any, {
        p_conversation_key: conversationKey,
        p_trace_id: traceId
      });

      if (lockError) {
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "conversation_lock_error",
          status: "warning",
          errorDetail: lockError.message,
          payload: { traceId, conversationKey }
        });
      }

      const hasLock = lockAcquired === true;

      if (!hasLock && !lockError) {
        // Outra execução está tratando esta conversa neste instante.
        await markEventFailed(msg.instance, finalMessageId, "conversation_locked_retry");
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "conversation_processing_locked",
          status: "skipped",
          payload: { traceId, conversationKey }
        });
        continue;
      }

      try {
        await logEvent({ 
          instance: msg.instance, 
          messageId: finalMessageId, 
          event: "processing_started", 
          status: "started", 
          payload: { 
            traceId, 
            reason,
            chat_orchestrator_loaded: {
              modulePath: "@/lib/chat.server",
              promptVersion: "1.3.0-phone-priority",
              subscriptionLookupMethod: "PHONE_ONLY"
            }
          } 
        });

        let unitId: string | null = null;
        // 5. Agente e Unidade

        const agent = await findAgentByInstance(msg.instance);
        const isIAActive = isIAEnabled(agent);

        if (agent) {
          const { updateConversationMetadata } = await import("./conversation.server");
          
          // RESOLUÇÃO DE UNIDADE DETERMINÍSTICA PELO NÚMERO RECEPTOR
          unitId = agent.unidade_id;
          
          await logEvent({
            instance: msg.instance,
            messageId: finalMessageId,
            event: "INBOUND_INSTANCE_RESOLVED", // Nome solicitado no requisito
            status: unitId ? "success" : "warning",
            payload: { 
              traceId,
              instanceId: msg.instance, // instanceId conforme requisito
              instanceName: msg.instance,
              agentId: agent.id,
              unitId: unitId,
              unitName: agent.nome, // Agente costuma ter o nome da Julia/Unidade
              source: "wa_agentes_lookup"
            }
          });


          await updateConversationMetadata(conversationKey, {
            agent_id: agent.id,
            unidade_id: unitId || undefined,
            contact_name: msg.pushName || undefined
          });
        }

        // 6. Persistência imediata (mídia aparece na Caixa de Entrada antes da análise)
        const normalized = normalizeIncomingMessage(msg.message, finalMessageId);
        const isMedia = normalized.messageType !== "text";
        const displayText = isMedia ? mediaPlaceholderText(normalized) : text || "[Mídia/Outro]";

        await appendIncomingMessage({
          conversationKey,
          messageId: finalMessageId,
          text: displayText,
          instance: msg.instance,
          phone,
          contactName: normalizeContactName(msg.pushName || undefined),
          isIAActive,
          metadata: isMedia
            ? {
                sourceType: normalized.messageType,
                mediaStatus: "queued",
                mimeType: normalized.mimeType ?? null,
                fileName: normalized.fileName ?? null,
                duration: normalized.duration ?? null,
                caption: normalized.caption || null,
                mediaReference: `${msg.instance}:${finalMessageId}`,
              }
            : null,
        });

        // 6b. Análise de mídia → texto para a IA
        let agentText: string | undefined = text || undefined;

        if (isMedia) {
          const { processIncomingMedia } = await import("./media-pipeline.server");
          const outcome = await processIncomingMedia({
            instance: msg.instance,
            messageId: finalMessageId,
            conversationKey,
            normalized,
          });

          agentText = outcome.agentText || undefined;

          if (!agentText && outcome.fallbackText && outcome.status !== "duplicate") {
            const { replyToUser } = await import("./reply.server");
            await replyToUser({
              instance: msg.instance,
              phone,
              text: outcome.fallbackText,
              conversationKey,
              messageId: finalMessageId,
              traceId,
              unitId: unitId
            });

            await logEvent({
              instance: msg.instance,
              messageId: finalMessageId,
              event: "media_response_sent",
              status: outcome.status,
              payload: { traceId },
            });
          }
        }

        // 7. Fluxo da IA (uma única chamada por mensagem)
        // NUNCA responde a mensagens enviadas pelo próprio número (fromMe)
        if (isIAActive && agentText && !isFromMe(msg.fromMe)) {
          await runAgentFlow(
            {
              ...msg,
              messageId: finalMessageId
            },
            agentText
          );
        }



        await markEventProcessed(msg.instance, finalMessageId);

        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "message_processing_completed",
          status: "success",
          payload: { traceId }
        });
      } catch (innerError) {
        await markEventFailed(
          msg.instance,
          finalMessageId,
          innerError instanceof Error ? innerError.message : String(innerError)
        );
        throw innerError;
      } finally {
        // 8. Liberar lock SEMPRE
        if (hasLock) {
          const { error: releaseError } = await supabaseAdmin.rpc("release_conversation_lock" as any, {
            p_conversation_key: conversationKey,
            p_trace_id: traceId
          });
          await logEvent({
            instance: msg.instance,
            messageId: finalMessageId,
            event: "conversation_lock_released",
            status: releaseError ? "error" : "success",
            errorDetail: releaseError?.message,
            payload: { traceId }
          });
        }
      }
    } catch (error) {
      console.error("[evolution] Error processing message", msg.messageId, error);
      await logEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        event: "process_error",
        status: "error",
        errorDetail: error instanceof Error ? error.message : String(error),
        payload: { traceId }
      });
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