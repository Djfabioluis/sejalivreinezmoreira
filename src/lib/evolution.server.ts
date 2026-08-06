// Cliente HTTP server-only para a Evolution API (WhatsApp Web via QR Code).
// Nunca importar em código de browser.
import { sanitizeCustomerText } from "@/lib/text-sanitize";
import { logger } from "./observability/logger.server";
import { AppError } from "./core/errors";
import { 
  enforceNoCpfInSubscriptionFlow, 
  containsCpfSolicitation,
  PHONE_REQUEST_MESSAGE,
  PHONE_RETRY_MESSAGE,
  HUMAN_HANDOFF_MESSAGE
} from "./subscription-policy.server";


async function getDbConfig(): Promise<{
  url: string;
  apiKey: string;
  webhookSecret?: string;
} | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo")
      .eq("id", 20)
      .maybeSingle();
    if (!data) return null;
    const parsed = JSON.parse((data as any).conteudo);
    if (parsed.url && parsed.apiKey) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function getEvolutionConfig() {
  const db = await getDbConfig();
  const url = (db?.url || process.env.EVOLUTION_API_URL || process.env.EVOLUTION_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const apiKey = db?.apiKey || process.env.EVOLUTION_API_KEY || "";
  const webhookSecret = db?.webhookSecret || process.env.EVOLUTION_WEBHOOK_SECRET || "";
  const debug = process.env.WHATSAPP_DEBUG === "true";

  return { url, apiKey, webhookSecret, debug };
}

export async function getEvolutionApiKey(): Promise<string> {
  const cfg = await getEvolutionConfig();
  if (!cfg.apiKey) throw new Error("EVOLUTION_API_KEY não configurada.");
  return cfg.apiKey;
}

export type EvolutionState = "aguardando_qr" | "conectado" | "desconectado";

export async function isEvolutionConfigured(): Promise<boolean> {
  const db = await getDbConfig();
  if (db?.url && db?.apiKey) return true;
  const envUrl = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_BASE_URL;
  return Boolean(envUrl && process.env.EVOLUTION_API_KEY);
}

async function evoFetch(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const { url: base, apiKey, debug } = await getEvolutionConfig();
  const url = `${base}${path}`;

  if (debug)
    logger.debug("EVOLUTION_API_REQUEST", `${init.method ?? "GET"} ${path}`);

  let res: Response;
  const startedAt = Date.now();
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err: any) {
    logger.error("EVOLUTION_API_CONNECTION_FAILED", err.message, { path, method: init.method });
    throw new AppError({
      code: "EVOLUTION_CONNECTION_FAILED",
      message: `Não foi possível conectar à Evolution API: ${err.message}`,
      safeMessage: "O serviço de WhatsApp está temporariamente indisponível."
    });
  }

  const durationMs = Date.now() - startedAt;
  const text = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (debug) {
    logger.debug("EVOLUTION_API_RESPONSE", `Status: ${res.status}`, { durationMs, path });
  }

  return { ok: res.ok, status: res.status, data, text };
}

/** Cria a instância (idempotente: 403/409 de "já existe" é tratado como sucesso). */
export async function createInstance(instance: string, webhookUrl: string) {
  const res = await evoFetch("/instance/create", {
    method: "POST",
    body: {
      instanceName: instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      },
    },
  });
  if (!res.ok) {
    const msg = String(res.data?.response?.message ?? res.data?.message ?? res.text);
    if (/already in use|already exists|já existe/i.test(msg)) return { ok: true, existed: true };
    throw new Error(`Evolution não criou a instância (${res.status}): ${msg.slice(0, 300)}`);
  }
  await setWebhook(instance, webhookUrl).catch(() => undefined);
  return { ok: true, existed: false };
}

export async function setWebhook(instance: string, webhookUrl: string) {
  await evoFetch(`/webhook/set/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: {
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      },
    },
  });
}

/** Retorna o QR Code em base64 (data URL) para escanear. */
export async function getQrCode(instance: string): Promise<string | null> {
  const res = await evoFetch(`/instance/connect/${encodeURIComponent(instance)}`);
  if (!res.ok) return null;
  const b64: string | undefined = res.data?.base64 ?? res.data?.qrcode?.base64;
  if (!b64) return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
}

export async function getConnectionState(instance: string): Promise<EvolutionState> {
  const res = await evoFetch(`/instance/connectionState/${encodeURIComponent(instance)}`);
  if (!res.ok) return "desconectado";
  const state: string = res.data?.instance?.state ?? res.data?.state ?? "";
  if (state === "open") return "conectado";
  if (state === "connecting") return "aguardando_qr";
  return "desconectado";
}

export async function logoutInstance(instance: string) {
  await evoFetch(`/instance/logout/${encodeURIComponent(instance)}`, { method: "DELETE" });
}

export async function deleteInstance(instance: string) {
  await logoutInstance(instance).catch(() => undefined);
  await evoFetch(`/instance/delete/${encodeURIComponent(instance)}`, { method: "DELETE" });
}


export async function sendEvolutionText(
  instance: string,
  to: string,
  body: string,
  typingMs = 0,
): Promise<boolean> {
  const number = to.replace(/\D/g, "");
  
  // PROTEÇÃO GLOBAL DE SAÍDA - O ÚLTIMO PONTO POSSÍVEL
  const safeText = await resolveSafeOutboundSubscriptionText({
    instance,
    to: number,
    text: body
  });

  if (safeText.blocked) {
    logger.audit("CPF_RESPONSE_GENERATED", "Uma resposta contendo CPF foi bloqueada no transporte final.", {
      instance,
      to: number,
      originalText: body,
      blockedText: safeText.text
    });
  }

  const text = sanitizeCustomerText(safeText.text).slice(0, 3500);

  const payload: Record<string, unknown> = { number, text };
  if (typingMs > 0) {
    payload.delay = typingMs;
    payload.presence = "composing";
    payload.options = { delay: typingMs, presence: "composing" };
  }
  
  const res = await evoFetch(`/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: payload,
  });
  
  if (!res.ok) {
    logger.error("EVOLUTION_SEND_TEXT_FAILED", `Status: ${res.status}`, { to, textSnippet: text.slice(0, 50) });
  }
  
  return res.ok;
}

/**
 * Proteção fail-closed no nível de transporte.
 */
async function resolveSafeOutboundSubscriptionText(params: {
  instance: string;
  to: string;
  text: string;
}): Promise<{ text: string; blocked: boolean; conversationContextFound: boolean }> {
  // Detector sem contexto (Rápido/Fail-closed)
  const cpfRequested = containsCpfSolicitation(params.text);
  
  if (!cpfRequested) {
    return { text: params.text, blocked: false, conversationContextFound: false };
  }

  // Se detectou solicitação de CPF, precisamos consultar o contexto para a mensagem de substituição correta
  // Mas o bloqueio já é garantido.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalizedPhone = params.to.replace(/\D/g, "");
    const conversationKey = `${params.instance}:${normalizedPhone}`;

    // Tentar encontrar a conversa
    const { data: conv } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("customer_context, status, attendance_mode")
      .eq("phone", conversationKey)
      .maybeSingle();

    let context = conv as any;
    if (!context) {
      // Fallback seguro
      const { data: fallbackConv } = await supabaseAdmin
        .from("wa_conversas" as never)
        .select("customer_context, status, attendance_mode")
        .eq("instance", params.instance)
        .eq("phone_number", normalizedPhone)
        .maybeSingle();
      context = fallbackConv;
    }

    const ctx = context?.customer_context || null;
    const enforced = enforceNoCpfInSubscriptionFlow(params.text, ctx);

    if (enforced.blocked) {
      logger.warn("SUBSCRIPTION_CPF_BLOCKED_AT_TRANSPORT", {
        instance: params.instance,
        phoneLast4: normalizedPhone.slice(-4),
        source: "sendEvolutionText",
        contextFound: !!context
      } as any);
      
      await logger.info("subscription_cpf_blocked_at_transport", {
        instance: params.instance,
        phoneLast4: normalizedPhone.slice(-4)
      } as any);
      return { 
        text: enforced.text, 
        blocked: true, 
        conversationContextFound: !!context 
      };
    }
  } catch (err: any) {
    logger.error("SUBSCRIPTION_CONTEXT_LOOKUP_FAILED", err.message, { instance: params.instance });
    // Se falhar a consulta, aplicamos a mensagem padrão (Fail-closed)
    return { 
      text: PHONE_REQUEST_MESSAGE, 
      blocked: true, 
      conversationContextFound: false 
    };
  }

  // Caso o detector tenha disparado mas o enforceNoCpf estranhamente retorne false (não deveria ocorrer com cpfRequested=true)
  return { 
    text: PHONE_REQUEST_MESSAGE, 
    blocked: true, 
    conversationContextFound: false 
  };
}

export async function sendEvolutionPresence(
  instance: string,
  to: string,
  presence: "composing" | "paused" | "recording" = "composing",
  delayMs = 3000,
): Promise<boolean> {
  const number = to.replace(/\D/g, "");
  const res = await evoFetch(`/chat/sendPresence/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: { number, delay: delayMs, presence },
  });
  return res.ok;
}

export async function sendEvolutionAudio(
  instance: string,
  to: string,
  mp3: Buffer,
): Promise<boolean> {
  const number = to.replace(/\D/g, "");
  const res = await evoFetch(`/message/sendWhatsAppAudio/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: { number, audio: mp3.toString("base64") },
  });
  return res.ok;
}

export async function fetchEvolutionMediaBase64(
  instance: string,
  messageKeyId: string,
): Promise<string | null> {
  const res = await evoFetch(`/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: { message: { key: { id: messageKeyId } }, convertToMp4: false },
  });
  if (!res.ok) return null;
  return (res.data?.base64 as string | undefined) ?? null;
}

export function instanceNameFor(phoneDigits: string): string {
  return `agente-${phoneDigits}`;
}

