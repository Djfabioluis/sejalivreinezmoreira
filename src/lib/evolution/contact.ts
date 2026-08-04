export function normalizePhone(remoteJid: string): string {
  return remoteJid.replace(/@s\.whatsapp.net|@c\.us/g, "");
}

export function normalizeContactName(pushName?: string): string | undefined {
  if (!pushName) return undefined;
  return pushName.trim();
}

export function buildConversationKey(instance: string, phone: string): string {
  // Garantir que o telefone esteja normalizado
  const normalizedPhone = normalizePhone(phone);
  return `${instance}:${normalizedPhone}`;
}
