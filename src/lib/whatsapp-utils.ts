/**
 * Normaliza o nome do contato vindo do WhatsApp.
 * Regras: trim, rejeita vazio, números, valores genéricos como unknown, limita tamanho.
 */
export function normalizeContactName(pushName: string | null | undefined): string | null {
  if (!pushName) return null;
  
  let name = pushName.trim();
  
  // Rejeitar se vazio ou apenas caracteres não alfanuméricos
  if (!name || /^[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+$/.test(name)) return null;
  
  // Rejeitar valores genéricos
  const lowers = name.toLowerCase();
  const generics = ["desconhecido", "unknown", "null", "undefined", "vazio", "empty", "whatsapp", "contato", "contact"];
  if (generics.includes(lowers)) return null;
  
  // Rejeitar se for apenas números (pode ser o próprio telefone no pushName)
  if (/^\d+$/.test(name.replace(/\D/g, ""))) {
    // Se sobrar algo além de números e for curto, pode ser um emoji/símbolo + número, melhor rejeitar
    if (name.length < 5) return null; 
  }

  // Limitar tamanho
  return name.slice(0, 50);
}

/**
 * Constrói a chave única da conversa: instancia:telefone
 */
export function buildConversationKey(instance: string, normalizedPhone: string): string {
  return `${instance.trim()}:${normalizedPhone.trim()}`;
}

/**
 * Normaliza o telefone removendo sufixos do JID e mantendo apenas dígitos.
 */
export function normalizeWhatsAppPhone(remoteJid: string): string {
  // Remove sufixos comuns
  let phone = remoteJid.split("@")[0];
  // Remove qualquer caractere que não seja dígito
  return phone.replace(/\D/g, "");
}
