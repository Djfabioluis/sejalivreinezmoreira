// WhatsApp Cloud API webhook. Public endpoint — validates signature before processing.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { type UIMessage } from "ai";
import { runAgent } from "@/lib/chat.server";
import { transcribeAudio, synthesizeSpeechMp3 } from "@/lib/ai-audio.server";

type WaMediaRef = { id: string; mime_type?: string };
type WaMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body?: string };
  audio?: WaMediaRef;
  voice?: WaMediaRef;
};
type WaValue = {
  messaging_product: string;
  metadata?: { phone_number_id?: string };
  messages?: WaMessage[];
};
type WaEntry = { changes?: Array<{ value?: WaValue; field?: string }> };
type WaPayload = { object?: string; entry?: WaEntry[] };

async function verifySignature(request: Request, rawBody: string): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error("[whatsapp] WHATSAPP_APP_SECRET não configurado — rejeitando webhook");
    return false;
  }
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

async function downloadWaMedia(
  mediaId: string,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return null;
  const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) {
    console.error("[whatsapp] falha ao obter URL de mídia:", meta.status, await meta.text());
    return null;
  }
  const info = (await meta.json()) as { url?: string; mime_type?: string };
  if (!info.url) return null;
  const file = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!file.ok) {
    console.error("[whatsapp] falha ao baixar mídia:", file.status);
    return null;
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  return { bytes: buf, mime: info.mime_type ?? "audio/ogg" };
}

async function uploadWaAudioMp3(mp3: Buffer): Promise<string | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "audio/mpeg");
  form.append("file", new Blob([new Uint8Array(mp3)], { type: "audio/mpeg" }), "reply.mp3");
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    console.error("[whatsapp] upload de áudio falhou:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

async function sendWhatsAppAudio(to: string, mediaId: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "audio",
      audio: { id: mediaId },
    }),
  });
  if (!res.ok) {
    console.error("[whatsapp] envio de áudio falhou:", res.status, await res.text());
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
                const phone = msg.from;
                let userText: string | null = null;
                let wasVoice = false;

                if (msg.type === "text" && msg.text?.body) {
                  userText = msg.text.body;
                } else if ((msg.type === "audio" || msg.type === "voice") && (msg.audio ?? msg.voice)) {
                  wasVoice = true;
                  const ref = msg.audio ?? msg.voice!;
                  try {
                    const media = await downloadWaMedia(ref.id);
                    if (!media) {
                      await sendWhatsAppText(phone, "Não consegui baixar seu áudio, pode tentar de novo?");
                      continue;
                    }
                    userText = await transcribeAudio(media.bytes, ref.mime_type ?? media.mime);
                    if (!userText?.trim()) {
                      await sendWhatsAppText(phone, "Não entendi o áudio, pode repetir por favor?");
                      continue;
                    }
                  } catch (err) {
                    console.error("[whatsapp] transcrição falhou:", err);
                    await sendWhatsAppText(phone, "Tive um problema ao ouvir seu áudio. Pode tentar de novo?");
                    continue;
                  }
                } else {
                  continue;
                }

                try {
                  const history = await loadHistory(phone);
                  const nextIn = [...history, textMessage("user", userText)];
                  const reply = await runAgent(nextIn);
                  const nextOut = [...nextIn, textMessage("assistant", reply)];
                  await saveHistory(phone, nextOut);
                  if (wasVoice) {
                    try {
                      const mp3 = await synthesizeSpeechMp3(reply);
                      const mediaId = await uploadWaAudioMp3(mp3);
                      if (mediaId) {
                        await sendWhatsAppAudio(phone, mediaId);
                      } else {
                        // Fallback para texto se upload falhar
                        await sendWhatsAppText(phone, reply);
                      }
                    } catch (err) {
                      console.error("[whatsapp] TTS/upload falhou, enviando texto:", err);
                      await sendWhatsAppText(phone, reply);
                    }
                  } else {
                    await sendWhatsAppText(phone, reply);
                  }
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
