import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";

async function runComprehensiveAudit() {
  console.log("==================================================");
  console.log("1. MAPEAR O FLUXO REAL");
  console.log("==================================================");
  
  const { data: counts } = await supabaseAdmin.from("crm_followups").select("status");
  const stats = (counts || []).reduce((acc: any, curr: any) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log("Status counts:", stats);

  console.log("\n==================================================");
  console.log("3. CONSULTAR FOLLOW-UPS VENCIDOS");
  console.log("==================================================");
  
  const now = new Date();
  const { data: overdue } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .lte("scheduled_at", now.toISOString())
    .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"]);
  
  console.log(`Follow-ups vencidos: ${overdue?.length || 0}`);
  if (overdue && overdue.length > 0) {
    console.log("Amostra:", overdue[0]);
  }

  console.log("\n==================================================");
  console.log("4. VALIDAR TIMEZONE");
  console.log("==================================================");
  
  const { data: tz } = await supabaseAdmin.rpc("get_system_time" as any).select();
  console.log("Timezone info:", tz);
  console.log("Local JS time (UTC):", now.toISOString());
  console.log("Local JS time (BR):", now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

  console.log("\n==================================================");
  console.log("9. TESTE DIRETO DO WORKER");
  console.log("==================================================");
  
  await processPendingFollowups();
  
  console.log("\nAudit finished.");
}

runComprehensiveAudit();
