// Server-only helper para enviar mensagens WhatsApp via Meta Cloud API.
import { getWhatsAppConfig } from "@/lib/whatsapp-config.server";
import { stripMarkdown } from "@/lib/text-sanitize";



export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  let cfg;
  try {
    cfg = await getWhatsAppConfig();
  } catch (err) {
    console.error("[whatsapp-send] credenciais ausentes:", err instanceof Error ? err.message : err);
    return false;
  }
  const digits = to.replace(/\D/g, "");
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: body.slice(0, 3500) },
      }),
    });
    if (!res.ok) {
      console.error("[whatsapp-send] falhou:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp-send] erro:", err);
    return false;
  }
}

export function formatBrDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return fmt.format(d).replace(",", " às");
  } catch {
    return iso;
  }
}
