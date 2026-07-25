// WhatsApp Cloud API webhook. Public endpoint — validates signature before processing.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { type UIMessage } from "ai";
import { runAgent } from "@/lib/chat.server";

type WaValue = {
  messaging_product: string;
  metadata?: { phone_number_id?: string };
  messages?: Array<{
    from: string;
    id: string;
    type: string;
    text?: { body?: string };
  }>;
};
type WaEntry = { changes?: Array<{ value?: WaValue; field?: string }> };
type WaPayload = { object?: string; entry?: WaEntry[] };

async function verifySignature(request: Request, rawBody: string): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; // sem segredo configurado ainda, aceita para permitir teste
  const header = request.headers.get("x-hub-signature-256");
  if (!header?.startsWith("sha256=")) return false;
  const provided = header.slice("sha256=".length);
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error("[whatsapp] WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID ausentes");
    return;
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: body.slice(0, 3500) },
    }),
  });
  if (!res.ok) {
    console.error("[whatsapp] envio falhou:", res.status, await res.text());
  }
}

async function loadHistory(phone: string): Promise<UIMessage[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("wa_conversas" as never)
    .select("messages")
    .eq("phone", phone)
    .maybeSingle();
  const raw = (data as { messages?: unknown } | null)?.messages;
  return Array.isArray(raw) ? (raw as UIMessage[]) : [];
}

async function saveHistory(phone: string, messages: UIMessage[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const trimmed = messages.slice(-40);
  await supabaseAdmin
    .from("wa_conversas" as never)
    .upsert({ phone, messages: trimmed, updated_at: new Date().toISOString() } as never);
}

function textMessage(role: "user" | "assistant", text: string): UIMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    parts: [{ type: "text", text }],
  } as UIMessage;
}

export const Route = createFileRoute("/api/public/whatsapp")({
  server: {
    handlers: {
      // Meta webhook verification (GET)
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!(await verifySignature(request, raw))) {
          return new Response("Invalid signature", { status: 401 });
        }
        let payload: WaPayload;
        try {
          payload = JSON.parse(raw) as WaPayload;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        // Responde 200 rápido e processa em background para respeitar timeout do Meta.
        const process = async () => {
          for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
              const value = change.value;
              for (const msg of value?.messages ?? []) {
                if (msg.type !== "text" || !msg.text?.body) continue;
                const phone = msg.from;
                const text = msg.text.body;
                try {
                  const history = await loadHistory(phone);
                  const nextIn = [...history, textMessage("user", text)];
                  const reply = await runAgent(nextIn);
                  const nextOut = [...nextIn, textMessage("assistant", reply)];
                  await saveHistory(phone, nextOut);
                  await sendWhatsAppText(phone, reply);
                } catch (err) {
                  console.error("[whatsapp] erro processando mensagem:", err);
                  await sendWhatsAppText(
                    phone,
                    "Desculpe, tivemos uma instabilidade aqui. Pode enviar de novo em instantes?",
                  );
                }
              }
            }
          }
        };
        // Fire-and-forget para não segurar a resposta ao Meta.
        void process();
        return new Response("ok", { status: 200 });
      },
    },
  },
});
