// Server-only helper para enviar mensagens WhatsApp via Meta Cloud API.
export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error("[whatsapp-send] credenciais ausentes");
    return false;
  }
  const digits = to.replace(/\D/g, "");
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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
