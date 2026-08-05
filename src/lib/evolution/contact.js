export function normalizePhone(remoteJid) {
    return remoteJid.replace(/@s\.whatsapp.net|@c\.us/g, "");
}
export function normalizeContactName(pushName) {
    if (!pushName)
        return undefined;
    return pushName.trim();
}
export function buildConversationKey(instance, phone) {
    // Garantir que o telefone esteja normalizado
    const normalizedPhone = normalizePhone(phone);
    return `${instance}:${normalizedPhone}`;
}
