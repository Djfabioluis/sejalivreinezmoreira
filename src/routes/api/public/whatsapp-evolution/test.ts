import { createFileRoute } from "@tanstack/react-router";
import { getEvolutionConfig } from "@/lib/evolution.server";

export const Route = createFileRoute("/api/public/whatsapp-evolution/test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Proteção básica via webhook secret ou admin session (se disponível no contexto de server route)
        const config = await getEvolutionConfig();
        const provided = new URL(request.url).searchParams.get("secret");
        
        if (config.webhookSecret && provided !== config.webhookSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        
        const results: any = {
          database_access: false,
          agent_found: false,
          evolution_config: false,
          ai_config: false,
        };

        try {
          // 1. Banco
          const { data: testDb } = await supabaseAdmin.from("wa_agentes" as never).select("count").limit(1);
          results.database_access = true;

          // 2. Agente específico
          const { data: agente } = await supabaseAdmin
            .from("wa_agentes" as never)
            .select("id")
            .eq("instancia", "agente-5541999102791")
            .maybeSingle();
          results.agent_found = !!agente;

          // 3. Evolution
          results.evolution_config = !!config.url && !!config.apiKey;

          // 4. AI
          results.ai_config = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        } catch (err: any) {
          results.error = err.message;
        }

        return Response.json(results);
      },
    },
  },
});
