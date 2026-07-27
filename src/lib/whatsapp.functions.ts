import { createServerFn } from "@tanstack/react-start";
import { getWhatsAppConfig } from "@/lib/whatsapp-config.server";

export const getWhatsAppPhoneNumber = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = await getWhatsAppConfig();
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${cfg.phoneNumberId}?fields=display_phone_number`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}` } },
    );
    const data = (await res.json()) as { display_phone_number?: string; error?: { message?: string } };
    if (!res.ok) {
      return { ok: false as const, error: data.error?.message ?? `Meta ${res.status}` };
    }
    const raw = data.display_phone_number ?? "";
    // +55 11 99999-9999 → 5511999999999
    const digits = raw.replace(/\D/g, "");
    return { ok: true as const, number: digits, formatted: raw, link: `https://wa.me/${digits}` };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
});
