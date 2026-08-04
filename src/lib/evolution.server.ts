// Cliente HTTP server-only para a Evolution API (WhatsApp Web via QR Code).
// Nunca importar em código de browser.
import { sanitizeCustomerText } from "@/lib/text-sanitize";

async function getDbConfig(): Promise<{ url: string; apiKey: string } | null> {
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

export async function getEvolutionApiKey(): Promise<string> {
  const db = await getDbConfig();
  const key = db?.apiKey || process.env.EVOLUTION_API_KEY;
  if (!key) throw new Error("EVOLUTION_API_KEY não configurada.");
  return key;
}
export function evolutionApiKey(): never {
  throw new Error("Use await getEvolutionApiKey() em vez de evolutionApiKey().");
}

export type EvolutionState = "aguardando_qr" | "conectado" | "desconectado";

async function getBaseUrl(): Promise<string> {
  const db = await getDbConfig();
  const raw = db?.url || process.env.EVOLUTION_API_URL;
  if (!raw) throw new Error("EVOLUTION_API_URL não configurada.");
  return raw.trim().replace(/\/+$/, "");
}

export async function isEvolutionConfigured(): Promise<boolean> {
  const db = await getDbConfig();
  return Boolean(db || (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY));
}

async function evoFetch(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const base = await getBaseUrl();
  const url = `${base}${path}`;
  
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        apikey: await getEvolutionApiKey(),
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const hostname = new URL(base).hostname;
    const isIpAddress = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const tlsHint = isIpAddress
      ? "A URL usa um endereço IP, mas o certificado HTTPS do servidor não é válido para esse IP. Configure um domínio com certificado SSL válido no proxy da Evolution e use esse domínio em EVOLUTION_API_URL."
      : "Confirme se o domínio possui certificado HTTPS público e válido.";
    throw new Error(
      `Não foi possível conectar à Evolution API. ${tlsHint} Detalhe técnico: ${detail}`,
    );
  }
  const text = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
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
  // Garante o webhook mesmo em versões que ignoram o campo no create.
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
  await evoFetch(`/instance/logout/${encodeURIComponent(instance)}`, { method: "DELETE" }).catch(
    () => undefined,
  );
  await evoFetch(`/instance/delete/${encodeURIComponent(instance)}`, { method: "DELETE" });
}

export async function sendEvolutionText(
  instance: string,
  to: string,
  body: string,
): Promise<boolean> {
  const number = to.replace(/\D/g, "");
  const res = await evoFetch(`/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: { number, text: sanitizeCustomerText(body).slice(0, 3500) },
  });
  if (!res.ok) console.error("[evolution] envio de texto falhou:", res.status, res.text.slice(0, 300));
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
  if (!res.ok) console.error("[evolution] envio de áudio falhou:", res.status, res.text.slice(0, 300));
  return res.ok;
}

/** Baixa mídia (áudio) de uma mensagem recebida, em base64. */
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

/** Gera um nome de instância seguro a partir do telefone. */
export function instanceNameFor(phoneDigits: string): string {
  return `agente-${phoneDigits}`;
}
