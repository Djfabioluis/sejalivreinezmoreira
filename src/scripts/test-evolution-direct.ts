import { supabaseAdmin } from "../integrations/supabase/client.server";
import { resolveOutboundInstanceForUnit } from "../lib/evolution/outbound-resolver.server";
import { sendEvolutionText } from "../lib/evolution.server";

async function runDirectTest() {
  const testPhone = "5541998430354"; 
  const unitId = "1";
  
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
    } else {
      console.error("[TEST_DIRECT_FAILED] Evolution returned success=false", result.data);
    }
  } catch (err: any) {
    console.error("[TEST_DIRECT_ERROR]", err.message);
  }
}

runDirectTest();
