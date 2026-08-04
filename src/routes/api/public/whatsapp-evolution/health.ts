import { createFileRoute } from "@tanstack/react-router";
import { getEvolutionConfig } from "@/lib/evolution.server";

export const Route = createFileRoute("/api/public/whatsapp-evolution/health")({
  server: {
    handlers: {
      GET: async () => {
        const config = await getEvolutionConfig();
        
        return Response.json({
          ok: true,
          webhook: true,
          evolutionConfigured: !!config.url && !!config.apiKey,
          aiConfigured: !!process.env.LOVABLE_AI_GATEWAY_TOKEN || !!process.env.GEMINI_API_KEY,
          instance: process.env.EVOLUTION_INSTANCE_NAME || "agente-5541999102791",
          debug: config.debug
        });
      }
    }
  }
});