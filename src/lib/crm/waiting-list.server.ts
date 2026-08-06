import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface CancellationData {
  unitId: string;
  serviceId: string;
  professionalId?: string;
  professionalName?: string;
  startTime: string;
  serviceName?: string;
}

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
      await (supabaseAdmin
        .from("crm_opportunities" as any) as any)
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

/**
 * Lida com o cancelamento de um agendamento no BEMP.
 * Cria uma oportunidade de horário vago (EMPTY_SLOT) e tenta casar com a lista de espera.
 */
export async function handleAppointmentCancellationForWaitingList(data: CancellationData) {
  console.log(`[waiting-list] Processando cancelamento de agendamento: ${data.startTime}`);

  // 1. Criar a oportunidade de slot
  const { data: newSlot, error } = await supabaseAdmin
    .from("crm_slot_opportunities")
    .insert({
      unidade_id: data.unitId,
      service_id: data.serviceId,
      professional_id: data.professionalId || null,
      start_at: data.startTime,
      end_at: data.startTime, // Simplificado
      status: 'pending',
      metadata: {
        professional_name: data.professionalName,
        service_name: data.serviceName,
        source: 'cancellation_webhook'
      }
    })
    .select()
    .single();

  if (error || !newSlot) {
    console.error("[waiting-list] Falha ao criar oportunidade de slot pós-cancelamento:", error);
    return;
  }

  // 2. Notificar imediatamente clientes em lista de espera (opcional, ou deixar para o cron)
  // Por simplicidade, deixamos o processWaitingList via cron lidar com isso na próxima execução.
}
