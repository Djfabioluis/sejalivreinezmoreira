import { createServerFn } from "@tanstack/react-start";

export const getWhatsAppPhoneNumber = createServerFn({ method: "GET" }).handler(async () => {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return { ok: false as const, error: "WhatsApp não configurado" };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}?fields=display_phone_number`,
      { headers: { Authorization: `Bearer ${token}` } },
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
