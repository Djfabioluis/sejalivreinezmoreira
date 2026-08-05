/**
 * Utilitários para rastreamento (traceId) e identificação única de respostas.
 */

export interface TraceContext {
  traceId: string;
  sourceMessageId: string;
  instance: string;
  conversationKey: string;
  assistantResponseId?: string;
}

export function createTraceId(instance: string, messageId: string): string {
  return `${instance}:${messageId}`;
}

export function createAssistantResponseId(instance: string, sourceMessageId: string): string {
  return `${instance}:${sourceMessageId}:assistant`;
}

/**
 * Padroniza o texto para o formato WhatsApp.
 * - Converte **texto** para *texto*
 * - Remove asteriscos triplos ou duplicados excessivos
 * - Preserva quebras de linha
 */
export function formatWhatsAppText(text: string): string {
  if (!text) return "";
  
  let formatted = text;
  
  // 1. Converter **texto** ou __texto__ para *texto* (padrão WhatsApp)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "*$1*");
  formatted = formatted.replace(/__(.*?)__/g, "_$1_");
  
  // 2. Limpar asteriscos duplicados em negritos que já são asteriscos
  // Ex: **texto** -> *texto* (já feito acima), mas se sobrar *** -> *
  formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, "*$1*");
  
  // 3. Garantir que títulos e tópicos usem o padrão Julia (• e *)
  // (A IA já deve fazer isso pelo prompt, mas aqui garantimos a sanidade do markdown)
  
  return formatted;
}
