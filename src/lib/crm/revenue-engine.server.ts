import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { updateCustomerPipeline } from "../crm.server";
import { sendEvolutionText } from "@/lib/evolution.server";

export type SlotOpportunityStatus = 'pending' | 'offered' | 'accepted' | 'declined' | 'expired' | 'reserved';

/**
 * Motor de Receita (Revenue Engine)
 * Identifica oportunidades em horários vagos e oferece para os clientes com maior probabilidade de conversão.
 */
export async function runRevenueEngine() {
  console.log("[revenue-engine] Iniciando processamento de horários...");

  // 1. Buscar oportunidades pendentes
  const { data: opportunities, error } = await supabaseAdmin
    .from("crm_slot_opportunities")
    .select("*")
    .eq("status", "pending")
    .limit(10);

  if (error || !opportunities) return;

  for (const opp of opportunities) {
    try {
      await processSlotOpportunity(opp);
    } catch (err) {
      console.error(`[revenue-engine] Falha ao processar oportunidade ${opp.id}:`, err);
    }
  }
}

async function processSlotOpportunity(opp: any) {
  // 2. Buscar clientes interessados no mesmo serviço/unidade/profissional
  const { data: candidates, error } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("phone, customer_name, conversion_score, last_interaction_at, current_stage")
    .eq("abandonment_reason", "PROFESSIONAL_UNAVAILABLE") // Exemplo de critério: quem desistiu por falta de horário
    .order("conversion_score", { ascending: false });

  if (error || !candidates || candidates.length === 0) {
    console.log(`[revenue-engine] Nenhum candidato encontrado para o slot ${opp.id}`);
    return;
  }

  // 3. Filtrar e criar ranking (lógica simplificada para MVP)
  // No futuro, cruzar com o período de preferência do cliente
  const ranking = candidates.map(c => ({
    phone: c.phone,
    name: c.customer_name,
    score: c.conversion_score,
    probability: (c.conversion_score || 50) / 100
  })).sort((a, b) => b.score - a.score);

  // 4. Salvar ranking e oferecer ao primeiro
  const bestCandidate = ranking[0];
  
  const { error: updateErr } = await supabaseAdmin
    .from("crm_slot_opportunities")
    .update({
      status: "offered",
      offered_to_phone: bestCandidate.phone,
      offer_sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(), // Expira em 30 min
      ranking_data: ranking
    })
    .eq("id", opp.id);

  if (updateErr) throw updateErr;

  // 5. Enviar mensagem via WhatsApp
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("instance, phone_number, contact_name")
    .eq("phone", bestCandidate.phone)
    .single();

  if (conv) {
    const time = new Date(opp.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(opp.start_at).toLocaleDateString('pt-BR');
    const message = `Boa notícia, ${conv.contact_name || 'cliente'}! 😊\n\nSurgiu um horário livre para o seu atendimento no dia ${date} às ${time}.\n\nGostaria que eu reservasse para você?`;
    
    await sendEvolutionText((conv as any).instance, (conv as any).phone_number, message);

    // Registrar no chat
    await supabaseAdmin.rpc("append_wa_message", {
      p_phone: bestCandidate.phone,
      p_message: {
        id: `rev-${Date.now()}`,
        role: 'assistant',
        parts: [{ type: 'text', text: message }],
        createdAt: new Date().toISOString(),
        metadata: { opportunity_id: opp.id }
      },
      p_instance: (conv as any).instance,
      p_phone_number: (conv as any).phone_number,
      p_increment_unread: false
    });
  }
}

/**
 * Chamado quando um cliente recusa uma oferta.
 * Passa a oportunidade para o próximo no ranking.
 */
export async function offerToNextCandidate(opportunityId: string) {
  const { data: opp, error } = await supabaseAdmin
    .from("crm_slot_opportunities")
    .select("*")
    .eq("id", opportunityId)
    .single();

  if (error || !opp) return;

  const ranking = (opp.ranking_data as any[]) || [];
  const currentIndex = ranking.findIndex(r => r.phone === opp.offered_to_phone);
  const nextCandidate = ranking[currentIndex + 1];

  if (!nextCandidate) {
    await supabaseAdmin
      .from("crm_slot_opportunities")
      .update({ status: "expired" })
      .eq("id", opportunityId);
    return;
  }

  // Oferecer ao próximo (reutiliza lógica do processSlotOpportunity mas atualiza o registro existente)
  // ... similar ao processSlotOpportunity mas focado no próximo do ranking
}
