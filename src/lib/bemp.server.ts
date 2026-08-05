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

export const PROFESSIONAL_PREFERENCE_NOTE = "com preferência";

function mergeNote(value: unknown, note: string) {
  if (typeof value !== "string" || value.trim().length === 0) return note;
  return value.includes(note) ? value : `${value.trim()}\n${note}`;
}

export function withProfessionalPreferenceNote(input: Record<string, unknown>) {
  const payload: Record<string, unknown> = { ...input };
  const hasProfessionalPreference =
    payload.professional_id != null ||
    payload.professionalId != null ||
    payload.preferred_professional_id != null;

  if (!hasProfessionalPreference) return payload;

  const note = mergeNote(payload.note, PROFESSIONAL_PREFERENCE_NOTE);

  // A integração pública de WhatsApp da BEMP não documenta o campo de observação,
  // mas a agenda usa `note`. Enviamos também aliases comuns para compatibilidade.
  payload.note = note;
  payload.notes = note;
  payload.schedule_note = note;
  payload.appointment_note = note;
  payload.customer_note = note;
  payload.client_note = note;
  payload.observation = note;
  payload.observacao = note;
  payload.observacoes = note;
  payload.observations = note;
  payload.schedule_observation = note;
  payload.appointment_observation = note;
  payload.customer_observation = note;
  payload.client_observation = note;
  payload.comment = note;
  payload.comments = note;
  payload.comentario = note;
  payload.comentarios = note;
  payload.description = note;
  payload.descricao = note;
  payload.obs = note;
  payload.schedule = {
    ...(typeof payload.schedule === "object" && payload.schedule !== null && !Array.isArray(payload.schedule)
      ? payload.schedule
      : {}),
    note,
  };
  payload.appointment = {
    ...(typeof payload.appointment === "object" && payload.appointment !== null && !Array.isArray(payload.appointment)
      ? payload.appointment
      : {}),
    note,
  };

  return payload;
}

function readStringId(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

export function extractBempAppointmentId(result: JsonValue): string | null {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const obj = result as Record<string, unknown>;
  const direct =
    readStringId(obj.id) ??
    readStringId(obj.schedule_id) ??
    readStringId(obj.appointment_id) ??
    readStringId(obj.scheduleId) ??
    readStringId(obj.appointmentId);
  if (direct) return direct;

  for (const key of ["data", "schedule", "appointment", "result"]) {
    const nested = obj[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const nestedId = extractBempAppointmentId(nested as JsonValue);
      if (nestedId) return nestedId;
    }
  }

  return null;
}

export async function tryUpdateBempScheduleNote(result: JsonValue, note: string): Promise<void> {
  const id = extractBempAppointmentId(result);
  if (!id) return;

  const cfg = await getBempConfig();
  const body = JSON.stringify({ note });
  const attempts: Array<[string, RequestInit]> = [
    [`${cfg.apiBase}/schedules/${id}`, { method: "PATCH", body }],
    [`${cfg.apiBase}/schedules/${id}`, { method: "PUT", body }],
  ];

  for (const [url, init] of attempts) {
    try {
      await bempFetch(url, init);
      return;
    } catch {
      // Endpoint de atualização pode não existir em todas as contas/versões da BEMP.
    }
  }
}

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

export class BempHttpError extends Error {
  readonly code = "bemp_http_error";
  constructor(
    readonly status: number,
    readonly endpoint: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "BempHttpError";
  }
}

function endpointPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export async function bempFetch(url: string, init?: RequestInit): Promise<JsonValue> {
  const cfg = await getBempConfig();
  const endpoint = endpointPath(url);
  const method = (init?.method || "GET").toUpperCase();
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...cfg.headers, ...(init?.headers as Record<string, string> | undefined) },
    });
  } catch (networkErr) {
    console.error(
      `[bemp] bemp_request_failed: method=${method}, endpoint=${endpoint}, durationMs=${Date.now() - startedAt}, error=${
        networkErr instanceof Error ? networkErr.message : String(networkErr)
      }`,
    );
    throw networkErr;
  }
  const durationMs = Date.now() - startedAt;
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
    // body sanitizado (sem tokens) e truncado para diagnóstico
    const safeBody = (typeof text === "string" ? text : "")
      .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1***")
      .slice(0, 400);
    console.error(
      `[bemp] bemp_response_error: method=${method}, endpoint=${endpoint}, status=${res.status}, durationMs=${durationMs}, body=${safeBody}`,
    );
    throw new BempHttpError(res.status, endpoint, `Bemp ${res.status}: ${msg}`, safeBody);
  }
  console.log(
    `[bemp] bemp_response_ok: method=${method}, endpoint=${endpoint}, status=${res.status}, durationMs=${durationMs}`,
  );
  return body;
}

