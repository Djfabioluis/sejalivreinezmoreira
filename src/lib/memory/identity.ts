/** Normaliza telefone preservando DDI e todos os dígitos válidos. */
export function normalizeMemoryPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = String(raw).split("@")[0] ?? "";
  const digits = cleaned.replace(/\D+/g, "");
  return digits;
}

/** Extrai o telefone de uma conversationKey no formato "instancia:telefone". */
export function phoneFromConversationKey(conversationKey: string | null | undefined): string {
  if (!conversationKey) return "";
  const parts = String(conversationKey).split(":");
  return normalizeMemoryPhone(parts.length > 1 ? parts.slice(1).join(":") : parts[0]);
}

/** Chave da organização/empresa dona do cliente (isolamento multi-empresa). */
export function resolveOrgKey(instanceOrKey?: string | null): string {
  const envOrg = process.env["AI_MEMORY_ORG_KEY"];
  if (envOrg && envOrg.trim()) return envOrg.trim();
  if (!instanceOrKey) return "default";
  const instance = String(instanceOrKey).split(":")[0]?.trim();
  return instance && instance.length > 0 ? instance : "default";
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, // CPF
  /\b(?:\d[ -]*?){13,19}\b/g, // cartão
  /\b(sk|pk|sb|Bearer)[-_ ]?[A-Za-z0-9._-]{12,}\b/g, // tokens
];

/** Mascara dados sensíveis antes de gravar em logs ou memória. */
export function maskSensitive(text: string | null | undefined): string {
  if (!text) return "";
  let out = String(text);
  for (const pattern of SENSITIVE_PATTERNS) out = out.replace(pattern, "[dado protegido]");
  return out;
}

const FORBIDDEN_MEMORY_PATTERNS: RegExp[] = [
  /senha/i,
  /cart[ãa]o/i,
  /c[óo]digo de seguran[çc]a/i,
  /cvv/i,
  /token/i,
  /\bpix copia e cola\b/i,
  /\bcpf\b/i,
  /\d{3}\.\d{3}\.\d{3}-\d{2}/,
  /\b\d{13,19}\b/,
];


/** Bloqueia conteúdos que nunca devem virar memória (privacidade). */
export function isForbiddenMemoryValue(value: unknown): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return FORBIDDEN_MEMORY_PATTERNS.some((re) => re.test(text));
}
