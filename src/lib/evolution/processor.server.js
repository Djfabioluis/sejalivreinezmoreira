import { normalizeEvolutionMessages } from "./message-normalizer";
import { checkIdempotency } from "./idempotency.server";
import { appendIncomingMessage } from "./conversation.server";
import { runAgentFlow, findAgentByInstance, isIAEnabled } from "./agent.server";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey, normalizeContactName } from "./contact";
/**
 * Orquestrador principal para eventos de mensagens (messages.upsert)
 */
export async function processMessagesUpsert(payload, requestUrl) {
    const startTime = Date.now();
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
    await logEvent({
        instance: messages[0].instance,
        event: "message_normalized",
        status: "success",
        payload: { count: messages.length, first_id: messages[0].messageId }
    });
    for (const msg of messages) {
        try {
            const text = extractMessageText(msg.message);
            const phone = normalizePhone(msg.remoteJid);
            // Ignorar grupos, transmissões e status
            if (msg.remoteJid.includes("@g.us") || msg.remoteJid.includes("@broadcast") || msg.remoteJid === "status@broadcast") {
                await logEvent({
                    instance: msg.instance,
                    messageId: msg.messageId,
                    event: "ignored_chat_type",
                    status: "skipped",
                    payload: { remoteJid: msg.remoteJid }
                });
                continue;
            }
            // Ignorar mensagens enviadas pelo próprio bot (fromMe) para processamento da IA
            // mas mantemos o fluxo caso precise de idempotência ou log, 
            // porém a IA só roda se !fromMe.
            // O requisito diz "Ignorar fromMe antes de appendIncomingMessage".
            if (msg.fromMe) {
                await logEvent({
                    instance: msg.instance,
                    messageId: msg.messageId,
                    event: "from_me_ignored",
                    status: "skipped"
                });
                continue;
            }
            // 2. Idempotência
            const { isDuplicate, finalMessageId } = await checkIdempotency(msg.instance, msg.messageId, phone, msg.timestamp, text || "");
            if (isDuplicate) {
                await logEvent({
                    instance: msg.instance,
                    messageId: finalMessageId,
                    event: "duplicate_message",
                    status: "skipped"
                });
                continue;
            }
            // 3. Agente e Unidade
            await logEvent({ instance: msg.instance, messageId: finalMessageId, event: "agent_lookup_started", status: "started" });
            const agent = await findAgentByInstance(msg.instance);
            if (!agent) {
                await logEvent({ instance: msg.instance, messageId: finalMessageId, event: "agent_not_found", status: "skipped" });
            }
            else {
                await logEvent({
                    instance: msg.instance,
                    messageId: finalMessageId,
                    event: "agent_found",
                    status: "success",
                    payload: { agentId: agent.id, agentStatus: agent.status, unitIdAvailable: !!agent.unidade_id }
                });
            }
            const isIAActive = isIAEnabled(agent);
            const conversationKey = buildConversationKey(msg.instance, msg.remoteJid);
            // 3.1 Atualizar metadados da conversa se o agente foi encontrado
            if (agent) {
                const { updateConversationMetadata } = await import("./conversation.server");
                await updateConversationMetadata(conversationKey, {
                    agent_id: agent.id,
                    unidade_id: agent.unidade_id,
                    contact_name: msg.pushName || undefined
                });
            }
            // 4. Persistência da Mensagem do Usuário
            const saved = await appendIncomingMessage({
                conversationKey,
                messageId: finalMessageId,
                text: text || "[Mídia/Outro]",
                instance: msg.instance,
                phone,
                contactName: normalizeContactName(msg.pushName || undefined),
                isIAActive
            });
            if (saved) {
                await logEvent({
                    instance: msg.instance,
                    messageId: finalMessageId,
                    event: "message_saved",
                    status: "success",
                    durationMs: Date.now() - startTime
                });
            }
            // 5. Fluxo da IA (se não for do próprio bot)
            if (!msg.fromMe) {
                await runAgentFlow({
                    ...msg,
                    messageId: finalMessageId
                });
            }
            await logEvent({
                instance: msg.instance,
                messageId: finalMessageId,
                event: "message_processing_completed",
                status: "success"
            });
        }
        catch (error) {
            console.error("[evolution] Error processing message", msg.messageId, error);
            await logEvent({
                instance: msg.instance,
                messageId: msg.messageId,
                event: "process_error",
                status: "error",
                errorDetail: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
/**
 * Orquestrador para atualizações de conexão
 */
export async function processConnectionUpdate(payload) {
    const instance = payload.instance || payload.instanceName || "unknown";
    await logEvent({
        instance,
        event: "connection.update",
        status: payload.data?.status || "updated",
        payload: payload.data
    });
    // Se a conexão foi aberta, podemos atualizar o status do agente no banco
    if (payload.data?.status === "open") {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
            .from("wa_agentes")
            .update({ status_conexao: "conectado" })
            .eq("instancia", instance);
    }
}
