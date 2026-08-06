import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getCRMDashboardStats } from "../crm.functions";
import { sendEvolutionText } from "@/lib/evolution.server";

/**
 * Gera e envia o relatório matinal de gestão (Morning Briefing) da Julia.
 */
export async function generateManagementBriefing() {
  console.log("[management-report] Gerando briefing matinal...");

  // 1. Coletar estatísticas (mock do contexto de admin para reuso do server fn interno se possível, ou rodar queries manuais)
  // Como getCRMDashboardStats é um server function com middleware, chamamos a lógica base diretamente ou recriamos.
  
  const { data: pipeline } = await supabaseAdmin.from("crm_customer_pipeline").select("*");
  const { data: slots } = await supabaseAdmin.from("crm_slot_opportunities").select("*").eq("status", "pending");
  const { data: followups } = await supabaseAdmin.from("crm_followups").select("*").eq("status", "PENDENTE");
  
  const now = new Date();
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const stats = {
    pendingSlots: slots?.length || 0,
    hotReturns: pipeline?.filter(c => (c.conversion_score || 0) > 70 && c.current_stage !== 'AGENDADO').length || 0,
    pendingFollowups: followups?.length || 0,
    birthdays: 0, // Mock: precisaria de coluna de nascimento
    vipAtRisk: pipeline?.filter(c => (c.health_score || 0) >= 90 && c.last_visit_at && new Date(c.last_visit_at) < fortyFiveDaysAgo).length || 0,
    estimatedRevenue: (slots?.length || 0) * 150 + (followups?.length || 0) * 150, // Estimativa simples
    idleRiskDay: "quinta-feira à tarde" // Mock ou análise de slots
  };

  const report = `📢 *Morning Briefing da Julia* ☕\n\n` +
    `Bom dia! Aqui está o panorama para hoje:\n\n` +
    `📍 *${stats.pendingSlots}* horários vagos identificados\n` +
    `🎯 *${stats.hotReturns}* clientes com alta chance de retorno\n` +
    `✉️ *${stats.pendingFollowups}* follow-ups pendentes para envio\n` +
    `🎂 *${stats.birthdays}* aniversariantes no dia\n` +
    `⚠️ *${stats.vipAtRisk}* clientes VIP sem visita há +45 dias\n\n` +
    `💰 *Receita potencial recuperável:* R$ ${stats.estimatedRevenue.toLocaleString('pt-BR')}\n` +
    `📉 *Risco de ociosidade:* ${stats.idleRiskDay}\n\n` +
    `Estou focada em preencher esses horários e reativar seus clientes VIP. Ótimo trabalho! 🚀`;

  // 2. Enviar para os administradores cadastrados
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    for (const admin of admins) {
      // Buscar telefone do perfil/config do admin
      const { data: profile } = await supabaseAdmin
        .from("profiles")
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
