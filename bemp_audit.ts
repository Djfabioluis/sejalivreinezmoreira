import { bempFetch, getBempConfig } from "./src/lib/bemp.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runAudit() {
  console.log("AUDIT_START");
  try {
    const cfg = await getBempConfig();
    const salons = await bempFetch(`${cfg.apiBase}/salons`) as any[];
    console.log("BEMP_SALONS:" + JSON.stringify(salons));
    
    const { data: agentes } = await supabaseAdmin.from("wa_agentes").select("*");
    console.log("WA_AGENTES:" + JSON.stringify(agentes));
  } catch (e) {
    console.log("AUDIT_ERROR:" + (e instanceof Error ? e.message : String(e)));
  }
}

runAudit();
