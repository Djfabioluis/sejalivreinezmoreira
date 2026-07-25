// Server-only helpers for calling the Bemp API. Never import this from a component.

export const BEMP_WEBHOOK_BASE = "https://webhooks.bemp.app/webhooks";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export function getBempConfig() {
  const dominio = process.env.BEMP_DOMINIO;
  const token = process.env.BEMP_TOKEN;
  if (!dominio || !token) {
    throw new Error("BEMP_DOMINIO/BEMP_TOKEN não configurados no servidor");
  }
  return {
    dominio,
    token,
    apiBase: `https://${dominio}.bemp.app/api`,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    } as Record<string, string>,
  };
}

export async function bempFetch(url: string, init?: RequestInit): Promise<JsonValue> {
  const cfg = getBempConfig();
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
