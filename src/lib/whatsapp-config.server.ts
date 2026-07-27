// Server-only helpers for WhatsApp Cloud API credentials. Never import from a component.

export type WhatsAppSettings = {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
};

const WHATSAPP_SETTINGS_ID = 4;

let _settingsCache: { value: WhatsAppSettings | null; expiresAt: number } | null = null;
const SETTINGS_TTL_MS = 60_000;

async function readSettingsFromDb(): Promise<WhatsAppSettings | null> {
  const now = Date.now();
  if (_settingsCache && _settingsCache.expiresAt > now) return _settingsCache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo")
      .eq("id", WHATSAPP_SETTINGS_ID)
      .maybeSingle();
    if (error || !data) {
      _settingsCache = { value: null, expiresAt: now + SETTINGS_TTL_MS };
      return null;
    }
    const raw = (data as { conteudo: string }).conteudo;
    const parsed = JSON.parse(raw) as Partial<WhatsAppSettings>;
    const value: WhatsAppSettings | null =
      parsed.accessToken && parsed.phoneNumberId && parsed.appSecret && parsed.verifyToken
        ? {
            accessToken: parsed.accessToken,
            phoneNumberId: parsed.phoneNumberId,
            appSecret: parsed.appSecret,
            verifyToken: parsed.verifyToken,
          }
        : null;
    _settingsCache = { value, expiresAt: now + SETTINGS_TTL_MS };
    return value;
  } catch {
    return null;
  }
}

export async function saveWhatsAppSettingsToDb(settings: WhatsAppSettings): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("base_conhecimento" as never)
    .upsert({
      id: WHATSAPP_SETTINGS_ID,
      conteudo: JSON.stringify(settings),
      updated_at: new Date().toISOString(),
    } as never);
  if (error) throw new Error(error.message);
  _settingsCache = null;
}

export async function getWhatsAppConfig(): Promise<WhatsAppSettings> {
  const dbSettings = await readSettingsFromDb();
  const accessToken = dbSettings?.accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = dbSettings?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = dbSettings?.appSecret ?? process.env.WHATSAPP_APP_SECRET;
  const verifyToken = dbSettings?.verifyToken ?? process.env.WHATSAPP_VERIFY_TOKEN;
  if (!accessToken || !phoneNumberId || !appSecret || !verifyToken) {
    throw new Error(
      "Credenciais do WhatsApp não configuradas. Acesse Configuração → WhatsApp para inserir os dados.",
    );
  }
  return { accessToken, phoneNumberId, appSecret, verifyToken };
}

export async function getWhatsAppSettingsSafe(): Promise<{
  phoneNumberId: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  source: "db" | "env" | "none";
}> {
  const db = await readSettingsFromDb();
  if (db) {
    return {
      phoneNumberId: db.phoneNumberId,
      hasAccessToken: !!db.accessToken,
      hasAppSecret: !!db.appSecret,
      hasVerifyToken: !!db.verifyToken,
      source: "db",
    };
  }
  const envAccess = process.env.WHATSAPP_ACCESS_TOKEN;
  const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const envSecret = process.env.WHATSAPP_APP_SECRET;
  const envVerify = process.env.WHATSAPP_VERIFY_TOKEN;
  if (envAccess && envPhone && envSecret && envVerify) {
    return {
      phoneNumberId: envPhone,
      hasAccessToken: true,
      hasAppSecret: true,
      hasVerifyToken: true,
      source: "env",
    };
  }
  return {
    phoneNumberId: envPhone ?? "",
    hasAccessToken: !!envAccess,
    hasAppSecret: !!envSecret,
    hasVerifyToken: !!envVerify,
    source: "none",
  };
}
