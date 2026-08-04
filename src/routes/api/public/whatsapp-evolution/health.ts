import { createFileRoute } from "@tanstack/react-router";
import { getEvolutionConfig, isEvolutionConfigured } from "@/lib/evolution.server";

export const Route = createFileRoute("/api/public/whatsapp-evolution/health")({
  server: {
    handlers: {
      GET: async () => {
        const config = await getEvolutionConfig();
        const evolutionReady = await isEvolutionConfigured();
        const aiConfigured = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        const ok = evolutionReady && aiConfigured;

        return Response.json({
          ok,
          evolutionConfigured: evolutionReady,
          aiConfigured: aiConfigured,
          instance: config.url ? "Configurada" : "Pendente",
          database: "Conectado",
          timestamp: new Date().toISOString()
        });
      },
    },
  },
});
