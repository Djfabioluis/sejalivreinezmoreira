// WhatsApp Cloud API webhook. Public endpoint — validates signature before processing.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { runAgentWithLogging } from "@/lib/chat.server";
import { transcribeAudio } from "@/lib/ai-audio.server";
import { getWhatsAppConfig } from "@/lib/whatsapp-config.server";
import { sanitizeCustomerText } from "@/lib/text-sanitize";
async function verifySignature(request, rawBody) {
    let appSecret;
    try {
        const cfg = await getWhatsAppConfig();
        appSecret = cfg.appSecret;
    }
    catch {
        console.error("[whatsapp] App Secret não configurado — rejeitando webhook");
        return false;
    }
    const header = request.headers.get("x-hub-signature-256");
    if (!header?.startsWith("sha256="))
        return false;
    const provided = header.slice("sha256=".length);
    const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const a = Buffer.from(provided, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length)
        return false;
    return timingSafeEqual(a, b);
}
async function sendWhatsAppText(to, body) {
    let cfg;
    try {
        cfg = await getWhatsAppConfig();
    }
    catch {
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
async function downloadWaMedia(mediaId) {
    let cfg;
    try {
        cfg = await getWhatsAppConfig();
    }
    catch {
        return null;
    }
    const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });
    if (!meta.ok) {
        console.error("[whatsapp] falha ao obter URL de mídia:", meta.status, await meta.text());
        return null;
    }
    const info = (await meta.json());
    if (!info.url)
        return null;
    const file = await fetch(info.url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } });
    if (!file.ok) {
        console.error("[whatsapp] falha ao baixar mídia:", file.status);
        return null;
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    return { bytes: buf, mime: info.mime_type ?? "audio/ogg" };
}
async function uploadWaAudioMp3(mp3) {
    let cfg;
    try {
        cfg = await getWhatsAppConfig();
    }
    catch {
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
    const data = (await res.json());
    return data.id ?? null;
}
async function sendWhatsAppAudio(to, mediaId) {
    let cfg;
    try {
        cfg = await getWhatsAppConfig();
    }
    catch {
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
async function loadHistory(phone) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
        .from("wa_conversas")
        .select("messages")
        .eq("phone", phone)
        .maybeSingle();
    const raw = data?.messages;
    return Array.isArray(raw) ? raw : [];
}
async function saveHistory(phone, messages) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const trimmed = messages.slice(-40);
    await supabaseAdmin
        .from("wa_conversas")
        .upsert({ phone, messages: trimmed, updated_at: new Date().toISOString() });
}
function textMessage(role, text) {
    return {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        parts: [{ type: "text", text }],
    };
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
                let verifyToken;
                try {
                    const cfg = await getWhatsAppConfig();
                    verifyToken = cfg.verifyToken;
                }
                catch {
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
                let payload;
                try {
                    payload = JSON.parse(raw);
                }
                catch {
                    return new Response("Bad JSON", { status: 400 });
                }
                // Responde 200 rápido e processa em background para respeitar timeout do Meta.
                const process = async () => {
                    for (const entry of payload.entry ?? []) {
                        for (const change of entry.changes ?? []) {
                            const value = change.value;
                            for (const msg of value?.messages ?? []) {
                                const phone = msg.from;
                                let userText = null;
                                let wasVoice = false;
                                if (msg.type === "text" && msg.text?.body) {
                                    userText = msg.text.body;
                                }
                                else if ((msg.type === "audio" || msg.type === "voice") && (msg.audio ?? msg.voice)) {
                                    wasVoice = true;
                                    const ref = msg.audio ?? msg.voice;
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
                                    }
                                    catch (err) {
                                        console.error("[whatsapp] transcrição falhou:", err);
                                        await sendWhatsAppText(phone, "Tive um problema ao ouvir seu áudio. Pode tentar de novo?");
                                        continue;
                                    }
                                }
                                else {
                                    continue;
                                }
                                try {
                                    const history = await loadHistory(phone);
                                    const conversationKey = `cloud:${phone}`;
                                    // Identificar o agente/unidade para o número (se houver)
                                    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                                    const { data: agent } = await supabaseAdmin
                                        .from("wa_agentes")
                                        .select("unidade_id, instancia")
                                        .eq("telefone", phone)
                                        .maybeSingle();
                                    // Se houver agente configurado com Evolution, o Cloud API deve ser ignorado ou delegar
                                    // Para manter compatibilidade, usamos runAgentWithLogging que já tem toda a instrumentação
                                    await runAgentWithLogging({
                                        instance: agent?.instancia || "cloud-api",
                                        remoteJid: `${phone}@s.whatsapp.net`,
                                        messageId: msg.id,
                                        phone: phone,
                                        conversationKey: conversationKey,
                                        text: userText,
                                        unidadeId: agent?.unidade_id || "5258", // Fallback para Ventura se não identificado
                                        pushName: "Cliente"
                                    });
                                }
                                catch (err) {
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
