// Server-only helpers for calling the Bemp API. Never import this from a component.

export const BEMP_WEBHOOK_BASE = "https://webhooks.bemp.app/webhooks";
const BEMP_SETTINGS_ID = 3;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export type BempSettings = { dominio: string; token: string };

let _settingsCache: { value: BempSettings | null; expiresAt: number } | null = null;
const SETTINGS_TTL_MS = 60_000;

async function readSettingsFromDb(): Promise<BempSettings | null> {
  const now = Date.now();
  if (_settingsCache && _settingsCache.expiresAt > now) return _settingsCache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo")
      .eq("id", BEMP_SETTINGS_ID)
      .maybeSingle();
    if (error || !data) {
      _settingsCache = { value: null, expiresAt: now + SETTINGS_TTL_MS };
      return null;
    }
    const raw = (data as { conteudo: string }).conteudo;
    const parsed = JSON.parse(raw) as Partial<BempSettings>;
    const value: BempSettings | null =
      parsed.dominio && parsed.token
        ? { dominio: parsed.dominio, token: parsed.token }
        : null;
    _settingsCache = { value, expiresAt: now + SETTINGS_TTL_MS };
    return value;
  } catch {
    return null;
  }
}

export async function saveSettingsToDb(settings: BempSettings): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("base_conhecimento" as never)
    .upsert({
      id: BEMP_SETTINGS_ID,
      conteudo: JSON.stringify(settings),
      updated_at: new Date().toISOString(),
    } as never);
  if (error) throw new Error(error.message);
  _settingsCache = null;
}

export async function getBempConfig() {
  const dbSettings = await readSettingsFromDb();
  const dominio = dbSettings?.dominio ?? process.env.BEMP_DOMINIO;
  const token = dbSettings?.token ?? process.env.BEMP_TOKEN;
  if (!dominio || !token) {
    throw new Error(
      "Credenciais Bemp não configuradas. Acesse Configuração → Integração Bemp para inserir domínio e token.",
    );
  }
  return {
    dominio,
    token,
    apiBase: `https://${dominio}.bemp.app/api`,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; SecretariaVirtual/1.0)",
    } as Record<string, string>,
  };
}

export async function getBempSettingsSafe(): Promise<{ dominio: string; hasToken: boolean; source: "db" | "env" | "none" }> {
  const db = await readSettingsFromDb();
  if (db) return { dominio: db.dominio, hasToken: !!db.token, source: "db" };
  const envDom = process.env.BEMP_DOMINIO;
  const envTok = process.env.BEMP_TOKEN;
  if (envDom && envTok) return { dominio: envDom, hasToken: true, source: "env" };
  return { dominio: envDom ?? "", hasToken: !!envTok, source: "none" };
}

export async function bempFetch(url: string, init?: RequestInit): Promise<JsonValue> {
  const cfg = await getBempConfig();
  const res = await fetch(url, {
    ...init,
    headers: { ...cfg.headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  const text = await res.text();
  let body: JsonValue = text as JsonValue;
  try {
    body = text ? (JSON.parse(text) as JsonValue) : null;
  } catch {
    // manter texto cru
  }
  if (!res.ok) {
    const msg =
      body && typeof body === "object" && !Array.isArray(body) && "message" in body
        ? String((body as { message: unknown }).message)
        : typeof body === "string" && body.length > 0
          ? body
          : `Bemp respondeu ${res.status}`;
    throw new Error(`Bemp ${res.status}: ${msg}`);
  }
  return body;
}
