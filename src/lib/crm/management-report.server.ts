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
  
  const now = new Date();
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const stats = {
    pendingSlots: slots?.length || 0,
    hotReturns: (pipeline as any[])?.filter(c => (c.conversion_score || 0) > 70 && c.current_stage !== 'AGENDADO').length || 0,
    pendingFollowups: followups?.length || 0,
    birthdays: 0,
    waitingList: (pipeline as any[])?.filter(c => c.abandonment_reason === 'PROFESSIONAL_UNAVAILABLE').length || 0,
    vipAtRisk: (pipeline as any[])?.filter(c => (c.health_score || 0) >= 90 && c.last_visit_at && new Date(c.last_visit_at) < fortyFiveDaysAgo).length || 0,
    estimatedRevenue: (slots?.length || 0) * 150 + (followups?.length || 0) * 150,
    idleRiskDay: "quinta-feira à tarde"
  };

  const report = `📢 *Morning Briefing da Julia* ☕\n\n` +
    `Bom dia! Aqui está o panorama estratégico de hoje:\n\n` +
    `📅 *Agenda e Ocupação:*\n` +
    `📍 *${stats.pendingSlots}* horários vagos identificados\n` +
    `👥 *${stats.waitingList}* clientes na lista de espera por vaga\n\n` +
    `🎯 *Relacionamento:*\n` +
    `🔥 *${stats.hotReturns}* clientes com alta chance de retorno\n` +
    `✉️ *${stats.pendingFollowups}* follow-ups pendentes\n` +
    `🎂 *${stats.birthdays}* aniversariantes\n` +
    `⚠️ *${stats.vipAtRisk}* clientes VIP em risco (+45 dias)\n\n` +
    `💰 *Impacto Financeiro:* R$ ${stats.estimatedRevenue.toLocaleString('pt-BR')}\n` +
    `📉 *Tendência de Ociosidade:* ${stats.idleRiskDay}\n\n` +
    `Já estou analisando a agenda para converter essas oportunidades. Vamos crescer! 🚀`;

  // 2. Enviar para os administradores
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      // Usar a tabela crm_customer_pipeline para buscar telefone do admin se ele for cliente, 
      // ou buscar em operador_permissoes que costuma ter vinculo com WhatsApp em alguns sistemas CRM
      // Para o MVP, buscamos via query raw no schema public se profiles não estiver tipado
      const { data: profile } = await (supabaseAdmin
        .from("profiles" as any) as any)
        .select("phone, whatsapp_instance")
        .eq("id", admin.user_id)
        .single();

      if (profile?.phone && profile.whatsapp_instance) {
        await sendEvolutionText(profile.whatsapp_instance, profile.phone, report);
      }
    }
  }

  return { ok: true, report };
}
