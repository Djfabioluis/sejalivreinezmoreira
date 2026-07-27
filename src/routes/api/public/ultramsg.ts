// Webhook de recebimento do UltraMsg (WhatsApp via QR Code).
// Validação: token compartilhado passado como query (?token=) ou header x-webhook-token.
import { createFileRoute } from "@tanstack/react-router";
import { type UIMessage } from "ai";
import { runAgent } from "@/lib/chat.server";
import { transcribeAudio, synthesizeSpeechMp3 } from "@/lib/ai-audio.server";
import {
  getUltraMsgConfig,
  sendUltraMsgText,
  sendUltraMsgAudio,
  uploadAudioSignedUrl,
} from "@/lib/ultramsg.server";

type UmMessage = {
  id?: string;
  from?: string;          // ex.: "5511999999999@c.us"
  to?: string;
  body?: string;
  type?: string;          // chat, ptt, audio, image, ...
  media?: string;         // URL pública da mídia (para audio/ptt/image)
  fromMe?: boolean;
  ack?: number;
};

type UmPayload =
  | { event_type?: string; data?: UmMessage; instanceId?: string }
  | UmMessage;

function extractMessage(payload: UmPayload): UmMessage | null {
  if (!payload) return null;
  if ("data" in payload && payload.data) return payload.data;
  const m = payload as UmMessage;
  return m.from ? m : null;
}

function phoneOf(from: string | undefined): string {
  if (!from) return "";
  return from.split("@")[0].replace(/\D/g, "");
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

async function downloadRemote(url: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "audio/ogg";
    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, mime };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/ultramsg")({
  server: {
    handlers: {
      // Ping de verificação — retorna 200 para o painel do UltraMsg testar
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const ct = request.headers.get("content-type") ?? "";
        console.log("[ultramsg] webhook hit", {
          ct,
          hasQueryToken: !!url.searchParams.get("token"),
          hasHeaderToken: !!request.headers.get("x-webhook-token"),
        });

        // Validação de token compartilhado (fail closed)
        let expectedToken: string;
        try {
          const cfg = await getUltraMsgConfig();
          expectedToken = cfg.webhookToken;
        } catch {
          console.error("[ultramsg] credenciais ausentes — rejeitando webhook");
          return new Response("Unauthorized", { status: 401 });
        }
        const provided =
          url.searchParams.get("token") ??
          request.headers.get("x-webhook-token") ??
          "";
        if (!provided || provided !== expectedToken) {
          console.warn("[ultramsg] token inválido");
          return new Response("Invalid token", { status: 401 });
        }

        // UltraMsg pode enviar JSON ou form-urlencoded — aceitamos ambos.
        let payload: UmPayload;
        try {
          if (ct.includes("application/json")) {
            payload = (await request.json()) as UmPayload;
          } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
            const form = await request.formData();
            const obj: Record<string, unknown> = {};
            for (const [k, v] of form.entries()) obj[k] = typeof v === "string" ? v : String(v);
            if (typeof obj.body === "string" && obj.body.trim().startsWith("{")) {
              try { payload = JSON.parse(obj.body) as UmPayload; }
              catch { payload = obj as UmPayload; }
            } else {
              payload = obj as UmPayload;
            }
          } else {
            const text = await request.text();
            try { payload = JSON.parse(text) as UmPayload; }
            catch {
              console.error("[ultramsg] body não parseável", { ct, preview: text.slice(0, 200) });
              return new Response("Bad body", { status: 400 });
            }
          }
        } catch (err) {
          console.error("[ultramsg] falha ao ler body:", err);
          return new Response("Bad body", { status: 400 });
        }

        console.log("[ultramsg] payload", JSON.stringify(payload).slice(0, 400));
        const msg = extractMessage(payload);
        if (!msg || msg.fromMe) {
          return new Response("ok", { status: 200 });
        }

        const phone = phoneOf(msg.from);
        if (!phone) return new Response("ok", { status: 200 });

        // Processa em background para responder rápido ao UltraMsg.
        const process = async () => {
          let userText: string | null = null;
          let wasVoice = false;

          const type = (msg.type ?? "").toLowerCase();
          if ((type === "chat" || type === "text") && msg.body) {
            userText = msg.body;
          } else if ((type === "ptt" || type === "audio" || type === "voice") && msg.media) {
            wasVoice = true;
            try {
              const media = await downloadRemote(msg.media);
              if (!media) {
                await sendUltraMsgText(phone, "Não consegui baixar seu áudio, pode tentar de novo?");
                return;
              }
              userText = await transcribeAudio(media.bytes, media.mime);
              if (!userText?.trim()) {
                await sendUltraMsgText(phone, "Não entendi o áudio, pode repetir por favor?");
                return;
              }
            } catch (err) {
              console.error("[ultramsg] transcrição falhou:", err);
              await sendUltraMsgText(phone, "Tive um problema ao ouvir seu áudio. Pode tentar de novo?");
              return;
            }
          } else {
            // ignora outros tipos (imagem, documento, ack...)
            return;
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
                const audioUrl = await uploadAudioSignedUrl(mp3);
                if (audioUrl) {
                  const ok = await sendUltraMsgAudio(phone, audioUrl);
                  if (!ok) await sendUltraMsgText(phone, reply);
                } else {
                  await sendUltraMsgText(phone, reply);
                }
              } catch (err) {
                console.error("[ultramsg] TTS/upload falhou, enviando texto:", err);
                await sendUltraMsgText(phone, reply);
              }
            } else {
              await sendUltraMsgText(phone, reply);
            }
          } catch (err) {
            console.error("[ultramsg] erro processando mensagem:", err);
            await sendUltraMsgText(
              phone,
              "Desculpe, tivemos uma instabilidade aqui. Pode enviar de novo em instantes?",
            );
          }
        };

        void process();
        return new Response("ok", { status: 200 });
      },
    },
  },
});
