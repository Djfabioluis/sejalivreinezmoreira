// Endpoint público chamado por pg_cron a cada hora para enviar lembretes 24h antes.
import { createFileRoute } from "@tanstack/react-router";
import { sendWhatsAppText, formatBrDateTime } from "@/lib/whatsapp-send.server";

type Row = {
  id: string;
  name: string | null;
  phone: string;
  start_at: string;
  service_name: string | null;
};

async function processReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  // Janela: entre 23h e 25h a partir de agora, ainda sem lembrete enviado.
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("agendamentos_notif" as never)
    .select("id, name, phone, start_at, service_name")
    .gte("start_at", from)
    .lte("start_at", to)
    .is("reminder_24h_sent_at", null)
    .eq("sandbox", false);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    const when = formatBrDateTime(r.start_at);
    const nome = r.name ?? "tudo bem";
    const svc = r.service_name ? ` de *${r.service_name}*` : "";
    const msg = `Oi ${nome}! 💜 Passando para lembrar do seu agendamento${svc} amanhã, ${when}.\n\nSe precisar remarcar ou cancelar, é só responder por aqui. Até lá! ✨\n— Julia, Salão Seja Livre`;
    const ok = await sendWhatsAppText(r.phone, msg);
    if (ok) {
      await supabaseAdmin
        .from("agendamentos_notif" as never)
        .update({ reminder_24h_sent_at: new Date().toISOString() } as never)
        .eq("id", r.id);
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return { checked: rows.length, sent, failed };
}

function checkCronSecret(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[lembretes] CRON_SECRET não configurado");
    return new Response("Server misconfigured", { status: 500 });
  }
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("token") ??
    "";
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

export const Route = createFileRoute("/api/public/hooks/lembretes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = checkCronSecret(request);
        if (unauth) return unauth;
        try {
          const result = await processReminders();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[lembretes] erro:", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async ({ request }) => {
        const unauth = checkCronSecret(request);
        if (unauth) return unauth;
        try {
          const result = await processReminders();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
