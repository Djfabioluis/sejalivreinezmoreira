// Server-only helpers para integração WhatsApp via UltraMsg (QR Code / WhatsApp Web).
// Nunca importar de componentes/loaders públicos.
import { sanitizeCustomerText } from "@/lib/text-sanitize";


export type UltraMsgSettings = {
  instanceId: string;     // ex.: "instance12345"
  token: string;          // token da instância no painel UltraMsg
  webhookToken: string;   // token compartilhado que validamos nos webhooks
};

const ULTRAMSG_SETTINGS_ID = 6;

let _cache: { value: UltraMsgSettings | null; expiresAt: number } | null = null;
const TTL_MS = 60_000;

async function readFromDb(): Promise<UltraMsgSettings | null> {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) return _cache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo")
      .eq("id", ULTRAMSG_SETTINGS_ID)
      .maybeSingle();
    if (error || !data) {
      _cache = { value: null, expiresAt: now + TTL_MS };
      return null;
    }
    const raw = (data as { conteudo: string }).conteudo;
    const parsed = JSON.parse(raw) as Partial<UltraMsgSettings>;
    const value: UltraMsgSettings | null =
      parsed.instanceId && parsed.token && parsed.webhookToken
        ? {
            instanceId: parsed.instanceId,
            token: parsed.token,
            webhookToken: parsed.webhookToken,
          }
        : null;
    _cache = { value, expiresAt: now + TTL_MS };
    return value;
  } catch {
    return null;
  }
}

export async function saveUltraMsgSettingsToDb(settings: UltraMsgSettings): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("base_conhecimento" as never)
    .upsert({
      id: ULTRAMSG_SETTINGS_ID,
      conteudo: JSON.stringify(settings),
      updated_at: new Date().toISOString(),
    } as never);
  if (error) throw new Error(error.message);
  _cache = null;
}

export function buildUltraMsgWebhookUrl(origin: string, webhookToken: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/public/ultramsg?token=${encodeURIComponent(webhookToken)}`;
}

export async function getUltraMsgConfig(): Promise<UltraMsgSettings> {
  const db = await readFromDb();
  if (!db) {
    throw new Error(
      "Credenciais do UltraMsg não configuradas. Acesse Configuração → UltraMsg para inserir os dados.",
    );
  }
  return db;
}

export async function getUltraMsgSettingsSafe(): Promise<{
  instanceId: string;
  hasToken: boolean;
  hasWebhookToken: boolean;
  configured: boolean;
}> {
  const db = await readFromDb();
  return {
    instanceId: db?.instanceId ?? "",
    hasToken: !!db?.token,
    hasWebhookToken: !!db?.webhookToken,
    configured: !!db,
  };
}

const UM_BASE = "https://api.ultramsg.com";

/** Normaliza destino para o formato aceito pelo UltraMsg (E.164 sem '+'). */
export function normalizeTo(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits;
}

/** Envia mensagem de texto via UltraMsg. */
export async function sendUltraMsgText(to: string, body: string): Promise<boolean> {
  let cfg: UltraMsgSettings;
  try {
    cfg = await getUltraMsgConfig();
  } catch (err) {
    console.error("[ultramsg-send] credenciais ausentes:", err instanceof Error ? err.message : err);
    return false;
  }
  const form = new URLSearchParams();
  form.set("token", cfg.token);
  form.set("to", normalizeTo(to));
  form.set("body", sanitizeCustomerText(body).slice(0, 3500));

  try {
    const res = await fetch(`${UM_BASE}/${cfg.instanceId}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) {
      console.error("[ultramsg-send] texto falhou:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[ultramsg-send] erro:", err);
    return false;
  }
}

/** Envia áudio (URL http/https pública ou assinada) via UltraMsg. */
export async function sendUltraMsgAudio(to: string, audioUrl: string): Promise<boolean> {
  let cfg: UltraMsgSettings;
  try {
    cfg = await getUltraMsgConfig();
  } catch {
    return false;
  }
  const form = new URLSearchParams();
  form.set("token", cfg.token);
  form.set("to", normalizeTo(to));
  form.set("audio", audioUrl);
  try {
    const res = await fetch(`${UM_BASE}/${cfg.instanceId}/messages/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) {
      console.error("[ultramsg-send] áudio falhou:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[ultramsg-send] erro áudio:", err);
    return false;
  }
}

export async function configureUltraMsgWebhook(origin: string): Promise<
  { ok: true; webhookUrl: string } | { ok: false; error: string; webhookUrl?: string }
> {
  let cfg: UltraMsgSettings;
  try {
    cfg = await getUltraMsgConfig();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }

  const webhookUrl = buildUltraMsgWebhookUrl(origin, cfg.webhookToken);
  const form = new URLSearchParams();
  form.set("token", cfg.token);
  form.set("sendDelay", "1");
  form.set("sendDelayMax", "15");
  form.set("webhook_url", webhookUrl);
  form.set("webhook_message_received", "true");
  form.set("webhook_message_create", "false");
  form.set("webhook_message_ack", "false");
  form.set("webhook_message_download_media", "true");

  try {
    const res = await fetch(`${UM_BASE}/${cfg.instanceId}/instance/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[ultramsg-settings] webhook falhou:", res.status, text.slice(0, 500));
      return { ok: false, error: `UltraMsg respondeu ${res.status}`, webhookUrl };
    }
    if (/error|invalid|false/i.test(text) && !/success|true|ok/i.test(text)) {
      console.error("[ultramsg-settings] resposta inesperada:", text.slice(0, 500));
      return { ok: false, error: "UltraMsg não confirmou a configuração do webhook", webhookUrl };
    }
    return { ok: true, webhookUrl };
  } catch (err) {
    console.error("[ultramsg-settings] erro:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Erro", webhookUrl };
  }
}

/** Faz upload de um MP3 no bucket wa-audio e devolve URL assinada válida por 24h. */
export async function uploadAudioSignedUrl(mp3: Buffer): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const filename = `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("wa-audio")
      .upload(filename, mp3, { contentType: "audio/mpeg", upsert: false });
    if (upErr) {
      console.error("[ultramsg-upload] falhou:", upErr.message);
      return null;
    }
    const { data, error } = await supabaseAdmin.storage
      .from("wa-audio")
      .createSignedUrl(filename, 60 * 60 * 24);
    if (error || !data) {
      console.error("[ultramsg-upload] signed url falhou:", error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error("[ultramsg-upload] erro:", err);
    return null;
  }
}

/** Testa se as credenciais respondem no endpoint /instance/me. */
export async function pingUltraMsg(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  let cfg: UltraMsgSettings;
  try {
    cfg = await getUltraMsgConfig();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
  try {
    const res = await fetch(`${UM_BASE}/${cfg.instanceId}/instance/me?token=${encodeURIComponent(cfg.token)}`);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error ?? `UltraMsg respondeu ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}
