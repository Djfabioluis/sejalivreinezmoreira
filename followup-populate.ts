import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";

async function populateTestFollowups() {
  console.log("=== POPULANDO FOLLOW-UPS DE TESTE ===");
  
  // 1. Pegar conversas abertas
  const { data: conversas } = await supabaseAdmin
    .from("wa_conversas")
    .select("phone, contact_name, instance, phone_number")
    .eq("status", "aberta")
    .limit(3);

  if (!conversas || conversas.length === 0) {
    console.error("Nenhuma conversa ativa encontrada para teste.");
    return;
  }

  for (const conv of conversas) {
    const scheduledAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos atrás (vencido)
    
    const { data, error } = await supabaseAdmin
      .from("crm_followups")
      .insert({
        phone: conv.phone,
        stage: 'IDENTIFICANDO_SERVICO',
        reason: 'Teste técnico de follow-up',
        scheduled_at: scheduledAt.toISOString(),
        status: 'PENDENTE',
        attempts: 0,
        metadata: { is_test: true }
      })
      .select()
      .single();

    if (error) {
      console.error(`Erro ao criar follow-up para ${conv.phone}:`, error.message);
    } else {
      console.log(`Follow-up criado para ${conv.phone} (ID: ${data.id})`);
    }
  }
}

populateTestFollowups().catch(console.error);
