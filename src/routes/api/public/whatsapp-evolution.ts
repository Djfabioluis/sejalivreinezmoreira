// Webhook público da Evolution API (WhatsApp Web via QR Code).
// Autentica pelo header `apikey` da própria Evolution antes de processar.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { type UIMessage } from "ai";
import { runAgent } from "@/lib/chat.server";
import { transcribeAudio, synthesizeSpeechMp3 } from "@/lib/ai-audio.server";
import {
  getEvolutionApiKey,
  fetchEvolutionMediaBase64,
  sendEvolutionAudio,
  sendEvolutionText,
} from "@/lib/evolution.server";

type EvoPayload = {
  event?: string;
  instance?: string;
  data?: any;
};

type Agente = {
  id: string;
  nome: string;
  tipo: "feminino" | "masculino";
  instancia: string;
};

const VOICES: Record<"feminino" | "masculino", string> = {
  feminino: "shimmer",
  masculino: "onyx",
};

function personaNote(a: Agente): string {
  if (a.tipo === "masculino") {
    return `IDENTIDADE DESTE CANAL: você é ${a.nome}, recepcionista do Salão Seja Livre, homem, voz e escrita masculinas. Use concordância no masculino ao falar de si ("pronto", "obrigado"). Mantenha o mesmo tom acolhedor e humano.`;
  }
  return `IDENTIDADE DESTE CANAL: você é ${a.nome}, recepcionista do Salão Seja Livre, mulher, voz e escrita femininas.`;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

async function loadAgente(instancia: string): Promise<Agente | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("wa_agentes" as never)
    .select("id,nome,tipo,instancia")
    .eq("instancia", instancia)
    .maybeSingle();
  return (data as unknown as Agente | null) ?? null;
}

async function markConnected(instancia: string, status: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("wa_agentes" as never)
    .update({ status, atualizado_em: new Date().toISOString() } as never)
    .eq("instancia", instancia);
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
  await supabaseAdmin
    .from("wa_conversas" as never)
    .upsert({ phone, messages: messages.slice(-40), updated_at: new Date().toISOString() } as never);
}

function textMessage(role: "user" | "assistant", text: string): UIMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    parts: [{ type: "text", text }],
  } as UIMessage;
}

export const Route = createFileRoute("/api/public/whatsapp-evolution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let expected: string;
        try {
          expected = await getEvolutionApiKey();
        } catch {
          return new Response("Evolution não configurada", { status: 503 });
        }
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("x-api-key") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!provided || !safeEqual(provided, expected)) {
          console.warn("[evolution] Webhook unauthorized: apikey mismatch");
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: EvoPayload;
        try {
          payload = (await request.json()) as EvoPayload;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const instancia = payload.instance ?? "";
        const event = (payload.event ?? "").toLowerCase().replace(/_/g, ".");

        if (event === "connection.update") {
          const state = (payload.data as any)?.state;
          if (state === "open") await markConnected(instancia, "conectado");
          else if (state === "close") await markConnected(instancia, "desconectado");
          return new Response("ok", { status: 200 });
        }

        if (event !== "messages.upsert") return new Response("ok", { status: 200 });

        // Evolution v2 envia as mensagens em data.messages[]
        // Evolution v1 envia a mensagem direto em data
        const messagesArr = Array.isArray(payload.data?.messages) 
          ? payload.data.messages 
          : [payload.data];

        for (const d of messagesArr) {
          if (!d) continue;
          
          const jid = d.key?.remoteJid ?? "";
          if (d.key?.fromMe || !jid || jid.endsWith("@g.us")) continue;

          const phone = jid.split("@")[0].replace(/\D/g, "");
          if (!phone) continue;

          const agente = await loadAgente(instancia);
          if (!agente) continue;

          // Processamento assíncrono para não travar o webhook
          (async () => {
            let userText: string | null = null;
            let wasVoice = false;

            const message = d.message;
            const plain = message?.conversation ?? message?.extendedTextMessage?.text ?? null;

            if (plain?.trim()) {
              userText = plain.trim();
            } else if (message?.audioMessage) {
              wasVoice = true;
              try {
                const b64 = d.base64 ?? (d.key?.id ? await fetchEvolutionMediaBase64(instancia, d.key.id) : null);
                if (!b64) {
                  await sendEvolutionText(instancia, phone, "Não consegui baixar seu áudio, pode tentar de novo?");
                  return;
                }
                const bytes = new Uint8Array(Buffer.from(b64, "base64"));
                userText = await transcribeAudio(bytes, message.audioMessage.mimetype ?? "audio/ogg");
              } catch (err) {
                console.error("[evolution] transcrição falhou:", err);
                await sendEvolutionText(instancia, phone, "Tive um problema ao ouvir seu áudio. Pode tentar de novo?");
                return;
              }
            }

            if (!userText?.trim()) return;

            try {
              const history = await loadHistory(phone);
              const nextIn = [...history, textMessage("user", userText)];
              const reply = await runAgent(nextIn, { persona: personaNote(agente) });
              await saveHistory(phone, [...nextIn, textMessage("assistant", reply)]);
              
              if (wasVoice) {
                try {
                  const mp3 = await synthesizeSpeechMp3(reply, { voice: VOICES[agente.tipo] });
                  const sent = await sendEvolutionAudio(instancia, phone, mp3);
                  if (!sent) await sendEvolutionText(instancia, phone, reply);
                } catch (err) {
                  console.error("[evolution] TTS falhou, enviando texto:", err);
                  await sendEvolutionText(instancia, phone, reply);
                }
              } else {
                await sendEvolutionText(instancia, phone, reply);
              }
            } catch (err) {
              console.error("[evolution] erro processando mensagem:", err);
              await sendEvolutionText(
                instancia,
                phone,
                "Desculpe, tivemos uma instabilidade aqui. Pode enviar de novo em instantes?",
              );
            }
          })().catch(e => console.error("[evolution] erro em background:", e));
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
