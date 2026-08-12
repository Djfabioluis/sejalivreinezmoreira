import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findAgentByInstance } from "@/lib/evolution/agent.server";
import { isEvolutionConfigured } from "@/lib/evolution.server";
import { isIAConfigured } from "@/lib/chat.server";

export const Route = createFileRoute("/api/public/whatsapp-evolution/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { data: dbCheck, error: dbError } = await supabaseAdmin
            .from("base_conhecimento")
            .select("count")
            .limit(1);
          
          const targetInstance = "agente-5541999102791";
          const agent = await findAgentByInstance(targetInstance);
          const evoOk = await isEvolutionConfigured();
          const aiOk = await isIAConfigured();

          return new Response(JSON.stringify({
            ok: !dbError && !!agent && evoOk && aiOk,
            status: {
              database: dbError ? "error" : "connected",
              agent_status: agent ? "found" : "not_found",
              evolution: evoOk ? "configured" : "missing",
              ai: aiOk ? "configured" : "missing",
            },
            instance: targetInstance
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ ok: false, error: "Internal Server Error" }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
  }
});
