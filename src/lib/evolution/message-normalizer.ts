import { NormalizedEvolutionMessage } from "./types";

export function normalizeEvolutionMessages(payload: any, requestUrl: string): NormalizedEvolutionMessage[] {
  const url = new URL(requestUrl);
  const queryInstance = url.searchParams.get("instance");
  
  const data = payload.data || payload;
  const msgArray = Array.isArray(data) ? data : (data.messages || [data]);
  
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

    if (!remoteJid) continue;

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
