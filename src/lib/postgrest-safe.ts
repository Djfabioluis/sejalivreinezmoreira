/**
 * Escapa caracteres especiais da sintaxe de filtros do PostgREST.
 *
 * Vírgulas, parênteses, pontos, aspas e barras invertidas alteram a estrutura
 * de uma expressão `.or(...)`. Sanitizamos o termo antes de interpolar.
 */
export function escapePostgrestPattern(term: string): string {
  return term
    .replace(/[\\]/g, "")
    .replace(/[,()."*:]/g, " ")
    .trim()
    .slice(0, 120);
}

/** Monta um padrão `ilike` seguro a partir de texto livre do usuário. */
export function safeIlikePattern(term: string): string {
  return `%${escapePostgrestPattern(term)}%`;
}
