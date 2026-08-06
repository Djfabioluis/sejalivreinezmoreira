// Classificação de falhas do atendimento automático (puro / testável).

export const GENERIC_FALLBACK_TEXT =
  "Não consegui concluir sua solicitação agora, mas já encaminhei para nossa equipe humana te ajudar em instantes! 💜";

export type FailureClass = {
  /** Código estável para logs/telemetria. */
  code: string;
  /** Mensagem enviada ao cliente. */
  userMessage: string;
  /** true = erro conhecido/tratado; false = inesperado (usa texto genérico). */
  expected: boolean;
  /** Deve mover a conversa para triagem humana? */
  escalate: boolean;
};

const TOKEN_PATTERNS: RegExp[] = [
  /(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi,
  /((?:api[_-]?key|token|authorization|apikey|secret|password)\s*[:=]\s*)["']?[A-Za-z0-9._~+/=-]{8,}["']?/gi,
  /\bey[A-Za-z0-9._-]{20,}\b/g, // JWTs
  /\bsb_(?:publishable|secret)_[A-Za-z0-9._-]{8,}\b/g,
];

/** Remove tokens/credenciais de qualquer texto antes de logar. */
export function sanitizeErrorText(input: unknown, maxLen = 1000): string {
  let out = typeof input === "string" ? input : String(input ?? "");
  for (const re of TOKEN_PATTERNS) out = out.replace(re, (_m, p1 = "") => `${p1}***`);
  return out.length > maxLen ? `${out.slice(0, maxLen)}…` : out;
}

/** Detalhes sanitizados de uma exceção, para logging estruturado. */
export function describeError(err: unknown): {
  name: string;
  message: string;
  stack: string | null;
  code?: string;
  status?: number;
} {
  const anyErr = err as Record<string, unknown>;
  return {
    name: err instanceof Error ? err.name : typeof err,
    message: sanitizeErrorText(err instanceof Error ? err.message : err, 500),
    stack: err instanceof Error && err.stack ? sanitizeErrorText(err.stack, 1500) : null,
    ...(anyErr?.["code"] !== undefined ? { code: sanitizeErrorText(anyErr["code"], 80) } : {}),
    ...(typeof anyErr?.["status"] === "number" ? { status: anyErr["status"] as number } : {}),
  };
}

/**
 * Traduz uma falha em código + mensagem ao cliente.
 * A mensagem genérica de "instabilidade" fica reservada a erros INESPERADOS.
 */
export function classifyFailure(err: unknown): FailureClass {
  const anyErr = err as Record<string, unknown>;
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const msg = raw.toLowerCase();
  const status: number | undefined =
    typeof anyErr?.["status"] === "number" ? (anyErr["status"] as number) : undefined;
  const code: string | undefined =
    typeof anyErr?.["code"] === "string" ? (anyErr["code"] as string) : undefined;

  // --- IA / gateway ---
  if (status === 402 || /payment required|insufficient credit|credits? exhausted/.test(msg)) {
    return {
      code: "ai_credits_exhausted",
      userMessage:
        "Nosso atendimento automático está temporariamente indisponível 😔\n\nJá avisei nossa equipe e em instantes alguém te responde por aqui 💛",
      expected: true,
      escalate: true,
    };
  }
  if (status === 429 || /rate limit|too many requests/.test(msg)) {
    return {
      code: "ai_rate_limited",
      userMessage:
        "Estou recebendo muitas mensagens ao mesmo tempo agora 😅\n\nPode me mandar de novo em alguns segundinhos? 💛",
      expected: true,
      escalate: false,
    };
  }

  // --- Erros de negócio conhecidos (vindos das tools) ---
  const known: Record<string, string> = {
    service_not_found:
      "Não encontrei esse serviço nessa unidade 😊 Quer que eu liste os disponíveis?",
    no_assigned_professionals:
      "No momento não temos profissional disponível para esse serviço nesta unidade 😔 Posso te mostrar outras opções?",
    professional_not_assigned_to_service:
      "Essa profissional não realiza esse serviço nesta unidade 😊 Quer que eu mostre quem atende?",
    no_slots: "Não encontrei horários livres nessa data 😊 Quer tentar outro dia?",
    conversation_not_found: GENERIC_FALLBACK_TEXT,
    cpf_invalid: "Não consegui validar esse número de telefone. Pode conferir e enviar novamente com o DDD, por favor? 💜",
    customer_not_found: "Não encontrei um cadastro com esse telefone. Pode conferir o número cadastrado, com DDD? ✨",
    plan_not_active: "Seu plano foi localizado, mas não há utilização disponível no momento. 😔",
    plan_no_balance: "Seu plano está ativo, mas parece que o saldo de utilizações acabou. 💛",
    SLOT_EXPIRED: "Esse horário acabou de ficar indisponível. Posso verificar outras opções para você? 💜",
    APPOINTMENT_CONFLICT: "Parece que já existe um agendamento para este horário. Vamos tentar outro? 😊",
    INVALID_BOOKING_DATA: "Alguns dados para o agendamento estão incompletos. Pode confirmar os detalhes comigo? ✨",
    BEMP_INVALID_RESPONSE: "A agenda confirmou o recebimento, mas houve uma falha ao gerar o comprovante. Vou pedir para nossa equipe conferir! 💜",
  };
  if (code && known[code]) {
    return { code, userMessage: known[code]!, expected: true, escalate: code === "BEMP_INVALID_RESPONSE" };
  }

  // --- BEMP (HTTP) ---
  if (/^bemp\s+\d{3}/i.test(raw) || code === "bemp_http_error" || code?.startsWith("BEMP_")) {
    const httpStatus = status ?? Number(raw.match(/bemp\s+(\d{3})/i)?.[1]);
    if (httpStatus === 404 || code === "NOT_FOUND") {
      return {
        code: "bemp_not_found",
        userMessage:
          "Não encontrei esse registro na agenda desta unidade 😊 Pode confirmar os dados pra mim?",
        expected: true,
        escalate: false,
      };
    }
    if (httpStatus === 422 || code === "INVALID_BOOKING_DATA") {
      return {
        code: "bemp_invalid_data",
        userMessage:
          "Alguns dados não foram aceitos pela agenda 😊 Pode confirmar serviço, data e horário?",
        expected: true,
        escalate: false,
      };
    }
    if (httpStatus === 401 || httpStatus === 403 || code === "UNAUTHORIZED") {
      return {
        code: "bemp_unauthorized",
        userMessage: GENERIC_FALLBACK_TEXT,
        expected: false,
        escalate: true,
      };
    }
    return {
      code: code || `bemp_http_${httpStatus || "error"}`,
      userMessage: GENERIC_FALLBACK_TEXT,
      expected: false,
      escalate: true,
    };
  }

  // Timeout ou erro de rede
  if (/timeout|econnrefused|enetunreach/i.test(msg)) {
    return {
      code: "integration_timeout",
      userMessage: GENERIC_FALLBACK_TEXT,
      expected: false,
      escalate: true,
    };
  }

  return {
    code: "unexpected_error",
    userMessage: GENERIC_FALLBACK_TEXT,
    expected: false,
    escalate: true,
  };
}