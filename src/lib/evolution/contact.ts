import { NormalizedEvolutionMessage } from "./types";

/**
 * Normaliza o telefone removendo sufixos do WhatsApp
 */
export function normalizePhone(remoteJid: string): string {
  if (!remoteJid) return "";
  return remoteJid.replace(/@s\.whatsapp.net|@c\.us|@lid/g, "");
}

export function normalizeContactName(pushName?: string): string | undefined {
  if (!pushName) return undefined;
  return pushName.trim();
}

/**
 * Reconstrói a chave única da conversa garantindo isolamento por instância
 */
export function buildConversationKey(instance: string, phone: string): string {
  const normalizedPhone = normalizePhone(phone);
  return `${instance}:${normalizedPhone}`;
}

export interface CustomerIdentity {
  conversationJid: string;
  phoneJid: string;
  phone: string;
  lid: string | null;
  identitySource: "remoteJid" | "remoteJidAlt" | "senderPn" | "lid_fallback";
}

/**
 * Resolve a identidade do cliente priorizando JIDs de telefone reais (@s.whatsapp.net)
 * em relação a identificadores LID (@lid).
 */
export function resolveCustomerIdentity(msg: NormalizedEvolutionMessage): CustomerIdentity {
  const remoteJid = msg.remoteJid;
  const remoteJidAlt = msg.remoteJidAlt;
  const senderPn = msg.senderPn;
  const lid = remoteJid.endsWith("@lid") ? remoteJid : (msg.senderLid || null);

  // 1. Prioridade: remoteJidAlt (comumente o telefone real quando remoteJid é LID)
  if (remoteJidAlt?.endsWith("@s.whatsapp.net")) {
    const phone = normalizePhone(remoteJidAlt);
    return {
      conversationJid: remoteJid,
      phoneJid: remoteJidAlt,
      phone,
      lid,
      identitySource: "remoteJidAlt"
    };
  }

  // 2. Prioridade: remoteJid original (se já for telefone)
  if (remoteJid.endsWith("@s.whatsapp.net") || remoteJid.endsWith("@c.us")) {
    const phone = normalizePhone(remoteJid);
    return {
      conversationJid: remoteJid,
      phoneJid: remoteJid,
      phone,
      lid,
      identitySource: "remoteJid"
    };
  }

  // 3. Prioridade: senderPn (Phone Number do sender)
  if (senderPn?.endsWith("@s.whatsapp.net")) {
    const phone = normalizePhone(senderPn);
    return {
      conversationJid: remoteJid,
      phoneJid: senderPn,
      phone,
      lid,
      identitySource: "senderPn"
    };
  }

  // 4. Fallback: Usar o LID como identificador de telefone (insuficiente mas mantém o fluxo)
  const phoneFallback = normalizePhone(remoteJid);
  return {
    conversationJid: remoteJid,
    phoneJid: remoteJid, // Fallback para o próprio LID se nada mais for encontrado
    phone: phoneFallback,
    lid,
    identitySource: "lid_fallback"
  };
}
