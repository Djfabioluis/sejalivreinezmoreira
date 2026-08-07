import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";

async function forceRetest() {
  console.log("=== LIMPANDO FALHAS E REAGENDANDO ===");
  await supabaseAdmin.from("crm_followups").update({ status: 'PENDENTE', attempts: 0 }).eq("status", "FALHA");
}

forceRetest().catch(console.error);
