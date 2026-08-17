import { createFileRoute } from "@tanstack/react-router";
import { processBempCancellation } from "@/lib/bemp/webhooks.server";

export const Route = createFileRoute("/api/public/bemp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get('X-Bemp-Webhook-Secret');
        if (process.env.BEMP_WEBHOOK_SECRET && secret !== process.env.BEMP_WEBHOOK_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }
        
        const payload = await request.json().catch(() => null);
        if (!payload) return new Response("Bad Request", { status: 400 });

        console.log("[bemp-webhook] Received event:", payload?.event || payload?.type || "unknown");
        
        await processBempCancellation(payload);

        return new Response("OK");
      }
    }
  }
})
