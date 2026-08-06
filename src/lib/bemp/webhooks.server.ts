import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bempFetch, BEMP_WEBHOOK_BASE } from "@/lib/bemp.server";
import { handleAppointmentCancellationForWaitingList } from "@/lib/crm/waiting-list.server";
import { analyzeCommercialOpportunities } from "@/lib/crm/commercial.server";

/**
 * Endpoint para processar webhooks da BEMP.
 */
export async function processBempWebhook(payload: any) {
  const event = payload?.event || payload?.type || payload?.action;
  const appointment = payload?.data || payload?.appointment || payload?.schedule;
  
  if (!appointment) return;

  // 1. Tratamento de Cancelamentos (Lista de Espera)
  if (event === 'appointment.cancelled' || event === 'schedule.cancelled' || event === 'cancel') {
    const unitId = String(appointment.salon_id || appointment.unit_id);
    const serviceId = String(appointment.service_id);
    const professionalId = appointment.professional_id ? String(appointment.professional_id) : undefined;
    const professionalName = appointment.professional?.name || appointment.professional_name || "profissional";
    const serviceName = appointment.service?.name || appointment.service_name || "atendimento";
    const startTime = appointment.start || appointment.start_at;

    if (unitId && serviceId && startTime) {
      await handleAppointmentCancellationForWaitingList({
        unitId,
        serviceId,
        professionalId,
        professionalName,
        startTime,
        serviceName
      });
    }
  }

  // 2. Tratamento de Conclusão (IA Comercial)
  if (event === 'appointment.completed' || event === 'schedule.completed' || event === 'complete' || event === 'checkout') {
    const customerPhone = appointment.customer?.phone || appointment.client_phone;
    if (customerPhone) {
      await analyzeCommercialOpportunities(customerPhone, {
        service_id: appointment.service_id,
        service_name: appointment.service?.name || appointment.service_name,
        unit_id: appointment.salon_id || appointment.unit_id,
        unit_name: appointment.salon?.name || appointment.unit_name
      });
    }
  }
}

/**
 * @deprecated Use processBempWebhook
 */
export async function processBempCancellation(payload: any) {
  return processBempWebhook(payload);
}

