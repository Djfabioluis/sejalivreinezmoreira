import { createFileRoute } from "@tanstack/react-router";
import { getEvolutionConfig, isEvolutionConfigured } from "@/lib/evolution.server";

export const Route = createFileRoute("/api/public/whatsapp-evolution/health")({
  server: {
    handlers: {
      GET: async () => {
        const config = await getEvolutionConfig();
        const evolutionReady = await isEvolutionConfigured();
        // O runtime da IA (src/lib/chat.server.ts) usa o AI Gateway da Lovable.
        const aiConfigured = !!process.env.LOVABLE_API_KEY;

        let databaseConfigured = false;
        let databaseReachable = false;
        try {
          databaseConfigured =
            !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("wa_agentes" as never)
            .select("id")
            .limit(1);
          databaseReachable = !error;
        } catch {
          databaseReachable = false;
        }

        const ok = evolutionReady && aiConfigured && databaseReachable;

        return Response.json({
          ok,
          evolutionConfigured: evolutionReady,
          aiConfigured,
          instance: config.url ? "Configurada" : "Pendente",
          databaseConfigured,
          databaseReachable,
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});
