import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";

async function cleanupAndRepopulate() {
  console.log("=== LIMPANDO E REPOPULANDO TESTES ===");
  
  // Limpar falhas anteriores
  await supabaseAdmin.from("crm_followups").delete().eq("status", "FALHA");

  const { data: conversas } = await supabaseAdmin
    .from("wa_conversas")
    .select("phone, contact_name, instance, phone_number")
    .eq("status", "aberta")
    .limit(1);

  if (!conversas || conversas.length === 0) return;

  const conv = conversas[0];
  const { data } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: conv.phone,
      stage: 'IDENTIFICANDO_SERVICO',
      reason: 'TESTE_DIAGNOSTICO_FINAL',
      scheduled_at: new Date(Date.now() - 10000).toISOString(),
      status: 'PENDENTE',
      attempts: 0
    })
    .select()
    .single();

  console.log(`Follow-up recriado: ${data?.id}`);
}

cleanupAndRepopulate().catch(console.error);
