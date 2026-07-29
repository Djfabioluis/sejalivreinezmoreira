/**
 * Remove marcações Markdown (asteriscos, underscores, backticks, headings)
 * usadas para negrito/itálico/código, mantendo o texto legível em WhatsApp.
 * Preserva listas numeradas ("1.") e itens com hífen.
 */
export function stripMarkdown(input: string): string {
  if (!input) return input;
  let out = input;
  // Remove **bold**, __bold__, *italic*, _italic_, `code`
  out = out.replace(/\*+/g, "");
  out = out.replace(/`+/g, "");
  // Underscores usados como marcação (rodeados por espaço/limite). Preserva no meio de palavras.
  out = out.replace(/(^|[\s(])_+(?=\S)/g, "$1");
  out = out.replace(/(?<=\S)_+(?=[\s).,;:!?]|$)/g, "");
  // Headings no início da linha
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  return out;
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
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/[ \t]+\n/g, "\n");
  return out.trim();
}

export function sanitizeCustomerText(input: string): string {
  return stripServiceDuration(stripMarkdown(input));
}
