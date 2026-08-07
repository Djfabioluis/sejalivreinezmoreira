import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";

async function forceRetest() {
  console.log("=== LIMPANDO FALHAS E REAGENDANDO (DUBLE STATUS) ===");
  await supabaseAdmin.from("crm_followups").update({ status: 'PENDENTE', attempts: 0 }).eq("status", "FALHA");
  await supabaseAdmin.from("crm_followups").update({ status: 'PENDING', attempts: 0 }).eq("status", "FAILED");
}

forceRetest().catch(console.error);
