// WhatsApp Cloud API webhook. Public endpoint — validates signature before processing.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { type UIMessage } from "ai";
import { runAgent, runAgentWithLogging } from "@/lib/chat.server";
import { ConversationService } from "@/lib/conversation-service.server";
import { transcribeAudio, synthesizeSpeechMp3 } from "@/lib/ai-audio.server";
import { getWhatsAppConfig } from "@/lib/whatsapp-config.server";
import { sanitizeCustomerText } from "@/lib/text-sanitize";

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
  let appSecret: string;
  try {
    const cfg = await getWhatsAppConfig();
    appSecret = cfg.appSecret;
  } catch {
    console.error("[whatsapp] App Secret não configurado — rejeitando webhook");
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
  let cfg;
  try {
    cfg = await getWhatsAppConfig();
  } catch {
    console.error("[whatsapp] credenciais do WhatsApp não configuradas");
    return;
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
        text: { body: sanitizeCustomerText(body).slice(0, 3500) },
    }),
  });
  if (!res.ok) {
    console.error("[whatsapp] envio falhou:", res.status, await res.text());
  }
}

async function downloadWaMedia(
  mediaId: string,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  let cfg;
  try {
    cfg = await getWhatsAppConfig();
  } catch {
    return null;
  }
  const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  });
  if (!meta.ok) {
    console.error("[whatsapp] falha ao obter URL de mídia:", meta.status, await meta.text());
    return null;
  }
  const info = (await meta.json()) as { url?: string; mime_type?: string };
  if (!info.url) return null;
  const file = await fetch(info.url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } });
  if (!file.ok) {
    console.error("[whatsapp] falha ao baixar mídia:", file.status);
    return null;
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  return { bytes: buf, mime: info.mime_type ?? "audio/ogg" };
}

async function uploadWaAudioMp3(mp3: Buffer): Promise<string | null> {
  let cfg;
  try {
    cfg = await getWhatsAppConfig();
  } catch {
    return null;
  }
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "audio/mpeg");
  form.append("file", new Blob([new Uint8Array(mp3)], { type: "audio/mpeg" }), "reply.mp3");
  const res = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
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
  let cfg;
  try {
    cfg = await getWhatsAppConfig();
  } catch {
    return;
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
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

async function saveHistory(phone: string, messages: UIMessage[], instance: string, phoneNumber: string) {
  const trimmed = messages.slice(-40);
  await ConversationService.findOrCreate({
    instance,
    phone_number: phoneNumber,
    contact_name: "Cliente",
    metadata: { source: "CloudAPI" }
  });
  
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("wa_conversas" as never)
    .update({ messages: trimmed as any, updated_at: new Date().toISOString() } as never)
    .eq("phone", `${instance}:${phoneNumber}`);
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
        let verifyToken: string | undefined;
        try {
          const cfg = await getWhatsAppConfig();
          verifyToken = cfg.verifyToken;
        } catch {
          verifyToken = undefined;
        }
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
                  const conversationKey = `cloud:${phone}`;
                  
                  // Identificar o agente/unidade para o número (se houver)
                  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                  const { data: agent } = await supabaseAdmin
                    .from("wa_agentes" as never)
                    .select("unidade_id, instancia")
                    .eq("telefone", phone)
                    .maybeSingle();

                  // Se houver agente configurado com Evolution, o Cloud API deve ser ignorado ou delegar
                  // Para manter compatibilidade, usamos runAgentWithLogging que já tem toda a instrumentação
                  await runAgentWithLogging({
                    messages: history,
                    instance: (agent as any)?.instancia || "cloud-api",
                    messageId: msg.id,
                    contactPhone: phone,
                    conversationKey: conversationKey,
                    text: userText,
                    unidadeId: (agent as any)?.unidade_id || "5258",
                    contactName: "Cliente"
                  } as any);

                } catch (err) {
                  console.error("[whatsapp] erro processando mensagem:", err);
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
