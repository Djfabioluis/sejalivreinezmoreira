// Server-only helpers for WhatsApp Cloud API health monitoring.
// Persists the latest health check result in base_conhecimento (id: 5).

import { getWhatsAppConfig } from "@/lib/whatsapp-config.server";

const WHATSAPP_HEALTH_ID = 5;

export type WhatsAppHealth = {
  checkedAt: string;
  ok: boolean;
  status: "connected" | "expired" | "invalid" | "unconfigured" | "error";
  message: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  httpStatus?: number;
  metaErrorCode?: number;
  metaErrorSubcode?: number;
};

async function saveHealth(h: WhatsAppHealth): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("base_conhecimento" as never).upsert({
      id: WHATSAPP_HEALTH_ID,
      conteudo: JSON.stringify(h),
      updated_at: new Date().toISOString(),
    } as never);
  } catch (err) {
    console.error("[whatsapp-health] failed to persist", err);
  }
}

export async function readWhatsAppHealth(): Promise<WhatsAppHealth | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo, updated_at")
      .eq("id", WHATSAPP_HEALTH_ID)
      .maybeSingle();
    if (!data) return null;
    const raw = (data as { conteudo: string }).conteudo;
    return JSON.parse(raw) as WhatsAppHealth;
  } catch {
    return null;
  }
}

// Classify Meta Graph API errors into an actionable status.
// See: https://developers.facebook.com/docs/graph-api/guides/error-handling
function classifyMetaError(code?: number, subcode?: number, message?: string): {
  status: WhatsAppHealth["status"];
  message: string;
} {
  const m = (message ?? "").toLowerCase();
  // OAuth / token issues
  if (code === 190) {
    if (subcode === 463 || m.includes("expired")) {
      return {
        status: "expired",
        message: "Access Token expirou. Gere um novo token no Meta Developers e salve na tela de configuração.",
      };
    }
    if (subcode === 467 || m.includes("session has been invalidated")) {
      return {
        status: "invalid",
        message: "Access Token foi invalidado. Gere um novo token permanente no Meta Developers.",
      };
    }
    return {
      status: "invalid",
      message: "Access Token inválido. Verifique se o token foi copiado corretamente.",
    };
  }
  if (code === 10 || code === 200 || code === 803) {
    return {
      status: "invalid",
      message: `Permissão insuficiente no token (código ${code}). Revise as permissões do app na Meta.`,
    };
  }
  return {
    status: "error",
    message: message ?? "Erro desconhecido ao contatar a Meta.",
  };
}

export async function runWhatsAppHealthCheck(): Promise<WhatsAppHealth> {
  const checkedAt = new Date().toISOString();

  let cfg: { accessToken: string; phoneNumberId: string };
  try {
    cfg = await getWhatsAppConfig();
  } catch (err) {
    const h: WhatsAppHealth = {
      checkedAt,
      ok: false,
      status: "unconfigured",
      message: err instanceof Error ? err.message : "Credenciais não configuradas",
    };
    await saveHealth(h);
    return h;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${cfg.phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${cfg.accessToken}` },
      },
    );
    const data = (await res.json()) as {
      display_phone_number?: string;
      verified_name?: string;
      error?: { message?: string; code?: number; error_subcode?: number };
    };
    if (!res.ok || data.error) {
      const classified = classifyMetaError(
        data.error?.code,
        data.error?.error_subcode,
        data.error?.message,
      );
      const h: WhatsAppHealth = {
        checkedAt,
        ok: false,
        status: classified.status,
        message: classified.message,
        httpStatus: res.status,
        metaErrorCode: data.error?.code,
        metaErrorSubcode: data.error?.error_subcode,
      };
      await saveHealth(h);
      return h;
    }
    const h: WhatsAppHealth = {
      checkedAt,
      ok: true,
      status: "connected",
      message: "Conectado à Meta Cloud API.",
      displayPhoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
      httpStatus: res.status,
    };
    await saveHealth(h);
    return h;
  } catch (err) {
    const h: WhatsAppHealth = {
      checkedAt,
      ok: false,
      status: "error",
      message: err instanceof Error ? err.message : "Falha de rede ao contatar a Meta.",
    };
    await saveHealth(h);
    return h;
  }
}
