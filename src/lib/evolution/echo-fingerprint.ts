/**
 * Correlação segura de eco de saída (mensagens enviadas pela própria IA que
 * voltam pelo webhook com um messageId diferente do retornado pela Evolution).
 *
 * A correlação primária continua sendo exata por messageId. Este módulo é
 * apenas o fallback: mesma instância + mesmo telefone normalizado + janela
 * curta + texto normalizado equivalente ao FOLLOWUP_EVOLUTION_REQUEST anterior.
 */

export const ECHO_FINGERPRINT_WINDOW_MS = 90_000;

/** Remove acentos, pontuação e espaços redundantes para comparação estável. */
export function normalizeEchoText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Telefone normalizado (apenas dígitos), tolerante a JIDs do WhatsApp. */
export function normalizeEchoPhone(value: unknown): string {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

/**
 * O payload de evo_webhook_logs pode estar salvo como objeto JSON ou como
 * string JSON (JSON.stringify no logEvent). Aceita ambos.
 */
export function parseLogPayload(payload: unknown): Record<string, any> | null {
  if (!payload) return null;
  if (typeof payload === "object") return payload as Record<string, any>;
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export type OutboundRequestLog = {
  created_at?: string | null;
  payload?: unknown;
};

function textsMatch(outbound: string, logged: string, loggedRaw: string): boolean {
  if (!outbound || !logged) return false;
  if (outbound === logged) return true;
  // FOLLOWUP_EVOLUTION_REQUEST guarda apenas um trecho ("textSnippet" + "...").
  if (loggedRaw.trim().endsWith("...")) return outbound.startsWith(logged);
  return false;
}

/**
 * Retorna o log correlacionado quando o eco pertence a uma mensagem que a
 * própria IA acabou de enviar. Caso contrário, retorna null (takeover humano).
 */
export function findEchoFingerprintMatch(params: {
  outboundText: string;
  phone: string;
  logs: OutboundRequestLog[];
  now?: number;
  windowMs?: number;
}): OutboundRequestLog | null {
  const outbound = normalizeEchoText(params.outboundText);
  if (!outbound) return null;

  const phone = normalizeEchoPhone(params.phone);
  const now = params.now ?? Date.now();
  const windowMs = params.windowMs ?? ECHO_FINGERPRINT_WINDOW_MS;

  for (const log of params.logs || []) {
    const payload = parseLogPayload(log?.payload);
    if (!payload) continue;

    const loggedPhone = normalizeEchoPhone(payload.to ?? payload.number ?? payload.phone);
    if (!loggedPhone || !phone) continue;
    if (loggedPhone !== phone && !loggedPhone.endsWith(phone) && !phone.endsWith(loggedPhone)) continue;

    const created = log?.created_at ? new Date(log.created_at).getTime() : NaN;
    if (Number.isFinite(created) && Math.abs(now - created) > windowMs) continue;

    const rawLogged = String(payload.textSnippet ?? payload.text ?? "");
    const logged = normalizeEchoText(rawLogged.replace(/\.\.\.$/, ""));
    if (textsMatch(outbound, logged, rawLogged)) return log;
  }

  return null;
}
