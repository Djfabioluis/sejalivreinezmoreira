// Cron-triggered WhatsApp Cloud API health check.
// Protected by CRON_SECRET. Called every 15 min by pg_cron.
import { createFileRoute } from "@tanstack/react-router";
import { runWhatsAppHealthCheck } from "@/lib/whatsapp-health.server";

function checkCronSecret(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[whatsapp-health] CRON_SECRET não configurado");
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

export const Route = createFileRoute("/api/public/hooks/whatsapp-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = checkCronSecret(request);
        if (unauth) return unauth;
        const health = await runWhatsAppHealthCheck();
        return Response.json(health);
      },
    },
  },
});
