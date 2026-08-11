import { runAgent } from "../lib/chat.server";
import { resolveOutboundInstanceForUnit } from "../lib/evolution/outbound-resolver.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

async function diagnose() {
  console.log("--- 6. PROVIDER TEST ---");
  try {
    const traceId = "diag-" + Date.now();
    const res = await runAgent({
      text: "Responda apenas OK",
      instance: "agente-5541998430354",
      contactPhone: "5541998800000",
      traceId
    });
    console.log("provider: lovable-gateway");
    console.log("model: google/gemini-2.5-flash");
    console.log("response:", res.text);
    console.log("HTTP status: 200 (Success)");
  } catch (err: any) {
    console.error("AI_PROVIDER_ERROR:", err.message);
  }

  console.log("\n--- INSTANCE RESOLUTION TEST ---");
  const units = ["1377", "1378", "5258"];
  for (const unitId of units) {
    const res = await resolveOutboundInstanceForUnit(unitId);
    console.log(`Unit ${unitId}: `, res ? `OK (${res.instanceId})` : "FAILED (OUTBOUND_INSTANCE_NOT_RESOLVED)");
  }

  console.log("\n--- GLOBAL BLOCKING FLAGS AUDIT ---");
  const { data: agents } = await supabaseAdmin.from("wa_agentes").select("instancia, ia_ativa, status");
  console.log("Agents Status:");
  agents?.forEach(a => console.log(`- ${a.instancia}: ia_ativa=${a.ia_ativa}, status=${a.status}`));
}

diagnose().catch(console.error);
