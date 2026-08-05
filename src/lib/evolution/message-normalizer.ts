import { NormalizedEvolutionMessage } from "./types";

export function normalizeEvolutionMessages(payload: any, requestUrl: string): NormalizedEvolutionMessage[] {
  const url = new URL(requestUrl);
  const queryInstance = url.searchParams.get("instance");
  
  const data = payload.data ?? payload;
  let msgArray: any[] = [];

  // Implementação da prioridade de payloads conforme solicitado
  if (Array.isArray(data)) {
    msgArray = data;
  } else if (data?.key && data?.message) {
    msgArray = [data];
  } else if (Array.isArray(data?.messages)) {
    msgArray = data.messages;
  } else if (Array.isArray(payload?.messages)) {
    msgArray = payload.messages;
  } else if (payload?.key && payload?.message) {
    msgArray = [payload];
  } else if (data) {
    // Caso genérico, mas mantendo o objeto original se possível
    msgArray = [data];
  }
  
  const results: NormalizedEvolutionMessage[] = [];

  for (const msg of msgArray) {
    if (!msg) continue;

    // Prioridade de extração da instância
    const instance = queryInstance || 
                     msg.instance || 
                     payload.instance || 
                     payload.instanceName || 
                     data.instance || 
                     data.instanceName;

    if (!instance) {
      console.warn("Evolution: Missing instance in payload", { payload_keys: Object.keys(payload), data_keys: data ? Object.keys(data) : null });
      continue;
    }

    // EXTRAÇÃO NORMALIZADA conforme especificação
    const key = msg.key ?? {};
    const remoteJid = key.remoteJid ?? msg.remoteJid ?? null;
    const messageId = key.id ?? msg.messageId ?? undefined; // Não usar null aqui para não quebrar checkIdempotency
    const pushName = msg.pushName ?? payload.pushName ?? null;
    const messageContent = msg.message ?? msg;
    const timestamp = Number(msg.messageTimestamp ?? payload.messageTimestamp ?? Date.now() / 1000);
    const rawFromMe = key.fromMe ?? msg.fromMe;
    const fromMe = rawFromMe === true || rawFromMe === 1 || rawFromMe === "true" || rawFromMe === "1";

    if (!remoteJid) {
      console.warn("Evolution: Missing remoteJid in normalized extraction", { msg_keys: Object.keys(msg), key_keys: Object.keys(key) });
      continue;
    }

    if (!messageId) {
      console.warn("Evolution: Missing messageId in normalized extraction", { msg_keys: Object.keys(msg), key_keys: Object.keys(key) });
      continue;
    }

    results.push({
      instance,
      remoteJid,
      messageId,
      pushName,
      message: messageContent,
      timestamp,
      fromMe
    });
  }

  return results;
}
