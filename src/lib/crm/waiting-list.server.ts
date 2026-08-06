import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { OpportunityType } from "./opportunity.server";

/**
 * Processa um cancelamento e busca clientes na lista de espera que se encaixem no perfil do horário vago.
 */
export async function handleAppointmentCancellationForWaitingList(params: {
  unitId: string;
  serviceId: string;
  professionalId?: string;
  professionalName: string;
  startTime: string;
  serviceName: string;
}) {
  console.log(`[waiting-list] Processing cancellation for unit ${params.unitId}, service ${params.serviceId}, time ${params.startTime}`);

  const startAt = new Date(params.startTime);
  const hour = startAt.getHours();
  
  let period = 'QUALQUER';
  if (hour < 12) period = 'MANHA';
  else if (hour < 18) period = 'TARDE';
  else period = 'NOITE';

  // 1. Buscar clientes na lista de espera para a mesma unidade e serviço
  const { data: waitingList } = await (supabaseAdmin
    .from("crm_waiting_list" as any) as any)
    .select("*")
    .eq("unit_id", params.unitId)
    .eq("service_id", params.serviceId)
    .eq("status", "ACTIVE");

  if (!waitingList || waitingList.length === 0) {
    console.log("[waiting-list] No matching customers found in waiting list.");
    return;
  }

  // 2. Filtrar e ordenar por profissional e período
  const matches = waitingList.filter((entry: any) => {
    // Se tiver período preferido e não for QUALQUER, deve bater
    if (entry.preferred_period && entry.preferred_period !== 'QUALQUER' && entry.preferred_period !== period) {
      return false;
    }
    return true;
  }).sort((a: any, b: any) => {
    // Priorizar quem escolheu o mesmo profissional
    const aProfMatch = a.professional_id === params.professionalId ? 1 : 0;
    const bProfMatch = b.professional_id === params.professionalId ? 1 : 0;
    return bProfMatch - aProfMatch;
  });

  if (matches.length === 0) return;

  // 3. Gerar oportunidades para os melhores matches (top 3 para aprovação)
  for (const match of matches.slice(0, 3)) {
    const timeFormatted = startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = startAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    const recommendedMessage = `Oi, ${match.customer_name || 'tudo bem'}! 💜 Acabou de surgir um horário para ${params.serviceName} no dia ${dateFormatted} às ${timeFormatted} com a profissional ${params.professionalName}. Deseja que eu reserve para você?`;

    await (supabaseAdmin
      .from("crm_opportunities" as any) as any)
      .insert({
        customer_id: match.customer_id,
        unit_id: params.unitId,
        opportunity_type: 'WAITING_LIST' as OpportunityType,
        priority: match.professional_id === params.professionalId ? 95 : 80,
        score: match.professional_id === params.professionalId ? 95 : 80,
        trigger: `Slot cancelado: ${params.serviceName} em ${params.unitId} (${params.professionalName})`,
        recommended_action: recommendedMessage,
        status: 'PENDENTE'
      });
    
    console.log(`[waiting-list] Generated WAITING_LIST opportunity for ${match.customer_id}`);
  }
}
