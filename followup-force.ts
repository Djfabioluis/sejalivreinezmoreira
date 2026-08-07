import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";

async function forceRetest() {
  console.log("=== FORÇANDO RETESTE COM LOGS ===");
  
  // Limpar estado para garantir elegibilidade
  await supabaseAdmin.from("crm_followups").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("phone, contact_name, instance, phone_number")
    .eq("status", "aberta")
    .limit(1)
    .single();

  if (!conv) {
    console.error("Sem conversas abertas.");
    return;
  }

  const { data: fup } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: conv.phone,
      stage: 'IDENTIFICANDO_SERVICO',
      reason: 'DEBUG_AUDIT',
      scheduled_at: new Date(Date.now() - 60000).toISOString(),
      status: 'PENDENTE',
      attempts: 0
    })
    .select()
    .single();

  console.log(`Follow-up criado: ${fup.id} para ${conv.phone}`);
}

forceRetest().catch(console.error);
