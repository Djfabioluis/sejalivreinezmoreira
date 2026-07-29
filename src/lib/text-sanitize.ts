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
