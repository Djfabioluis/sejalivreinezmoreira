/**
 * Remove marcações Markdown (asteriscos, underscores, backticks, headings)
 * usadas para negrito/itálico/código, mantendo o texto legível em WhatsApp.
 * Preserva listas numeradas ("1.") e itens com hífen.
 */
export function stripMarkdown(input: string): string {
  // A IA agora gera negritos no padrão WhatsApp (*texto*) e listas (•).
  // Não removemos mais os asteriscos, pois o WhatsApp os interpreta.
  return input;
}

/**
 * Remove informações de duração que não devem aparecer para o cliente
 * nas listas/confirmações de serviços, mantendo horários de agenda intactos.
 */
export function stripServiceDuration(input: string): string {
  if (!input) return input;
  let out = input;
  out = out.replace(/\s*[([]\s*(?:dura[cç][aã]o|tempo)\s*(?:aprox\.?|aproximad[ao])?[^)\]]*\d+\s*(?:min(?:utos?)?|h|hora?s?)\s*[)\]]/gi, "");
  out = out.replace(/\s*(?:[-–—,;:]\s*)?(?:dura[cç][aã]o|tempo)\s*(?:aprox\.?|aproximad[ao])?\s*(?:de\s*)?\d+\s*(?:min(?:utos?)?|h|hora?s?)\b/gi, "");
  // Removidas as transformações que colapsavam espaços e quebras de linha:
  // out = out.replace(/\s{2,}/g, " ");
  // out = out.replace(/[ \t]+\n/g, "\n");
  // return out.trim();
  return out;
}

export function sanitizeCustomerText(input: string): string {
  // Agora preservamos quebras de linha e formatação Markdown/WhatsApp.
  return stripServiceDuration(input);
}
