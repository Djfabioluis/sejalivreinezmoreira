import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { getEvolutionConfig } from "@/lib/evolution.server";

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    if (x.length !== y.length) return false;
    return timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/whatsapp-evolution/test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = await getEvolutionConfig();

        // Fail-closed: sem segredo configurado o diagnóstico não existe publicamente.
        if (!config.webhookSecret) {
          return new Response("Not Found", { status: 404 });
        }

        const provided =
          request.headers.get("x-webhook-secret") ||
          (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
          new URL(request.url).searchParams.get("secret") ||
          "";

        if (!safeEqual(provided, config.webhookSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const results: Record<string, unknown> = {
          database_access: false,
          agent_found: false,
          evolution_config: false,
          ai_config: false,
        };

        try {
          const { error: dbError } = await supabaseAdmin
            .from("wa_agentes" as never)
            .select("id")
            .limit(1);
          results.database_access = !dbError;

          const { data: agente } = await supabaseAdmin
            .from("wa_agentes" as never)
            .select("id")
            .eq("instancia", "agente-5541999102791")
            .maybeSingle();
          results.agent_found = !!agente;

          results.evolution_config = !!config.url && !!config.apiKey;
          results.ai_config = !!process.env.LOVABLE_API_KEY;
        } catch (err: any) {
          results.error = String(err?.message ?? err).slice(0, 300);
        }

        return Response.json(results);
      },
    },
  },
});
