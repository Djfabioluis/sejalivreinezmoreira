import { NormalizedEvolutionMessage } from "./types";

export function normalizeEvolutionMessages(payload: any, requestUrl: string): NormalizedEvolutionMessage[] {
  const url = new URL(requestUrl);
  const queryInstance = url.searchParams.get("instance");
  
  // Support payload.data.messages, payload.data.message, payload.messages, payload.message
  const data = payload.data || payload;
  let msgArray: any[] = [];
  if (Array.isArray(data)) {
    msgArray = data;
  } else if (data.messages && Array.isArray(data.messages)) {
    msgArray = data.messages;
  } else if (data.message) {
    msgArray = [data.message];
  } else {
    // If it's a single message object directly in data
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

    if (!instance) continue;

    const key = msg.key || {};
    const remoteJid = key.remoteJid;
    const messageId = key.id;
    const pushName = msg.pushName || data.pushName || payload.pushName;
    const messageContent = msg.message || msg;
    const timestamp = msg.messageTimestamp || data.messageTimestamp || Math.floor(Date.now() / 1000);
    const fromMe = !!key.fromMe;

    if (!instance) {
      console.warn("Evolution: Missing instance in payload", msg);
      continue;
    }

    if (!remoteJid) {
      console.warn("Evolution: Missing remoteJid in payload", msg);
      continue;
    }

    if (!messageId) {
      console.warn("Evolution: Missing messageId in payload", msg);
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
