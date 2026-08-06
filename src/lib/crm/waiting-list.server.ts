import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Motor de Lista de Espera Inteligente
 * Identifica clientes que demonstraram interesse em horários indisponíveis.
 */
export async function processWaitingList() {
  console.log("[waiting-list] Processando lista de espera...");

  // 1. Buscar oportunidades de horários vagos recém-criadas
  const { data: opportunities } = await supabaseAdmin
    .from("crm_slot_opportunities")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!opportunities || opportunities.length === 0) return;

  // 2. Buscar clientes que estão na "Lista de Espera" (abandonaram por falta de horário)
  const { data: waitingCustomers } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("*")
    .eq("abandonment_reason", "PROFESSIONAL_UNAVAILABLE")
    .order("conversion_score", { ascending: false });

  if (!waitingCustomers || waitingCustomers.length === 0) return;

  for (const opp of opportunities) {
    // Tenta encontrar um cliente compatível
    const candidate = waitingCustomers.find(c => {
      // No futuro: validar unidade e serviço
      return true; 
    });

    if (candidate) {
      console.log(`[waiting-list] Casamento encontrado: Cliente ${candidate.phone} para Slot ${opp.id}`);
      
      // Marcar oportunidade como WAITING_LIST para o Revenue Engine processar
      await supabaseAdmin
        .from("crm_opportunities" as any)
        .insert({
          customer_id: candidate.phone,
          opportunity_type: 'WAITING_LIST',
          score: candidate.conversion_score || 90,
          trigger: `Horário vago encontrado em ${new Date(opp.start_at).toLocaleDateString()}`,
          status: 'PENDENTE',
          metadata: {
            slot_opportunity_id: opp.id,
            start_at: opp.start_at
          }
        });
    }
  }
}
