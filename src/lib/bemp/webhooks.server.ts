import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bempFetch, BEMP_WEBHOOK_BASE } from "@/lib/bemp.server";
import { handleAppointmentCancellationForWaitingList } from "@/lib/crm/waiting-list.server";

/**
 * Endpoint para processar webhooks de cancelamento da BEMP.
 * Deve ser configurado na BEMP para apontar para /api/public/bemp-webhook
 */
export async function processBempCancellation(payload: any) {
  const event = payload?.event || payload?.type;
  
  // A BEMP costuma enviar 'appointment.cancelled' ou 'schedule.cancelled'
  if (event === 'appointment.cancelled' || event === 'schedule.cancelled' || payload?.action === 'cancel') {
    const appointment = payload?.data || payload?.appointment || payload?.schedule;
    if (!appointment) return;

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
}
