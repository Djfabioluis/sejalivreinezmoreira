import { supabaseAdmin } from "./integrations/supabase/client.server";
import { resolveOutboundInstanceForUnit } from "./lib/evolution/outbound-resolver.server";
import { sendEvolutionText } from "./lib/evolution.server";
import { logger } from "./lib/observability/logger.server";

async function runDirectTest() {
  const testPhone = "5541998430354"; // Telefone de teste controlado
  const unitId = "1"; // Unidade Centro
  
  console.log(`[TEST_DIRECT_START] Unidade: ${unitId}, Telefone: ${testPhone}`);
  
  try {
    const outbound = await resolveOutboundInstanceForUnit(unitId);
    if (!outbound) {
      console.error("[TEST_DIRECT_FAILED] Could not resolve outbound instance for unit 1");
      return;
    }
    
    console.log(`[TEST_DIRECT_RESOLVED] Instance: ${outbound.instanceName}, Status: VALIDATED`);
    
    const result = await sendEvolutionText(
      outbound.instanceName, 
      testPhone, 
      "Teste Direto Follow-up: Conexão Evolution Unificada. 💜"
    );
    
    if (result.success) {
      console.log(`[TEST_DIRECT_SUCCESS] Message ID: ${result.data?.key?.id || result.data?.message?.key?.id}`);
      console.log("[TEST_DIRECT_RESULT] SENT (HTTP 200/201)");
    } else {
      console.error("[TEST_DIRECT_FAILED] Evolution returned success=false", result.data);
    }
  } catch (err: any) {
    console.error("[TEST_DIRECT_ERROR]", err.message);
    if (err.details) {
      console.error("[TEST_DIRECT_DIAGNOSTICS]", JSON.stringify(err.details, null, 2));
    }
  }
}

runDirectTest();
