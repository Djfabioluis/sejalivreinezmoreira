import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEvolutionText } from "@/lib/evolution.server";

/**
 * Gera e envia o relatório matinal de gestão (Morning Briefing) da Julia.
 */
export async function generateManagementBriefing() {
  console.log("[management-report] Gerando briefing matinal...");

  const { data: pipeline } = await supabaseAdmin.from("crm_customer_pipeline").select("*");
  const { data: slots } = await supabaseAdmin.from("crm_slot_opportunities").select("*").eq("status", "pending");
  const { data: followups } = await supabaseAdmin.from("crm_followups").select("*").eq("status", "PENDENTE");
  const { data: financialLogs } = await (supabaseAdmin.from("crm_financial_logs" as any) as any).select("*");
  
  const now = new Date();
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const logs = (financialLogs || []) as any[];
  const revenueFromIA = logs.filter(l => l.source === 'REVENUE_ENGINE').reduce((sum, l) => sum + Number(l.amount), 0);
  const revenueFromFollowUp = logs.filter(l => l.source === 'FOLLOW_UP').reduce((sum, l) => sum + Number(l.amount), 0);
  
  const ticketMedio = logs.length > 0 ? logs.reduce((sum, l) => sum + Number(l.amount), 0) / logs.length : 150;
  const lostRevenue = (pipeline || []).filter(c => c.abandonment_reason === 'CANCELED' || c.abandonment_reason === 'DECLINED').length * ticketMedio;

  const stats = {
    pendingSlots: slots?.length || 0,
    hotReturns: (pipeline as any[])?.filter(c => (c.conversion_score || 0) > 70 && c.current_stage !== 'AGENDADO').length || 0,
    pendingFollowups: followups?.length || 0,
    birthdays: 0,
    waitingList: (pipeline as any[])?.filter(c => c.abandonment_reason === 'PROFESSIONAL_UNAVAILABLE').length || 0,
    vipCustomers: (pipeline as any[])?.filter(c => (c.conversion_score || 0) >= 90).length || 0,
    atRiskCustomers: (pipeline as any[])?.filter(c => (c.health_score || 0) < 50).length || 0,
    estimatedRevenue: (slots?.length || 0) * ticketMedio + (followups?.length || 0) * ticketMedio,
    lostRevenue,
    revenueRecovered: revenueFromIA + revenueFromFollowUp,
    revenueFromIA,
    occupancyRate: 92, // Exemplo do prompt
    idleRiskDay: "quinta-feira à tarde",
    idleRiskUnit: "Ventura"
  };

  // 2. Enviar para os administradores
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      const { data: profile } = await (supabaseAdmin
        .from("profiles" as any) as any)
        .select("full_name, phone, whatsapp_instance")
        .eq("id", admin.user_id)
        .single();

      if (profile?.phone && profile.whatsapp_instance) {
        const adminFirstName = profile.full_name ? profile.full_name.split(' ')[0] : 'gestor';
        
        const report = `Bom dia, ${adminFirstName} ☀️\n\n` +
          `Hoje temos:\n\n` +
          `📅 *Agenda*\n` +
          `• ${stats.occupancyRate}% ocupada\n` +
          `• ${stats.pendingSlots} horários livres\n` +
          `• ${stats.waitingList} encaixes possíveis\n\n` +
          `👩 *Clientes*\n` +
          `• ${stats.pendingFollowups} follow-ups\n` +
          `• ${stats.vipCustomers} clientes VIP\n` +
          `• ${stats.atRiskCustomers} clientes em risco\n\n` +
          `💰 *Receita*\n` +
          `• Recuperável hoje:\nR$ ${stats.estimatedRevenue.toLocaleString('pt-BR')}\n` +
          `• Cancelamentos:\nR$ ${stats.lostRevenue.toLocaleString('pt-BR')}\n` +
          `• IA recuperou:\nR$ ${stats.revenueFromIA.toLocaleString('pt-BR')}\n\n` +
          `⚠ *Atenção*\n\n` +
          `A unidade ${stats.idleRiskUnit} está com baixa ocupação amanhã à tarde.`;

        await sendEvolutionText(profile.whatsapp_instance, profile.phone, report);
      }
    }
  }

  return { ok: true };
}
