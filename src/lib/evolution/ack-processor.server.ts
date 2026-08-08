import { logger } from "@/lib/observability/logger.server";
import { logEvent } from "./logger.server";

export async function processMessageAck(payload: any) {
  const instance = payload.instance || payload.instanceName || "unknown";
  const data = payload.data || {};
  const messageId = data.key?.id || data.id;
  const status = data.status || data.ack; // Evolution sends status (0, 1, 2, 3, 4)

  if (!messageId) return;

  // Map status numbers to CRM status
  // 0: PENDING, 1: SENT, 2: RECEIVED (DELIVERED), 3: READ, 4: PLAYED
  const statusMap: Record<string, string> = {
    "0": "PENDING",
    "1": "SENT",
    "2": "DELIVERED",
    "3": "READ",
    "4": "READ"
  };

  const newStatus = statusMap[String(status)];
  if (!newStatus) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const traceId = `ack-${instance}-${messageId}-${Date.now()}`;

  try {
    // 1. Update CRM Followups
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("crm_followups")
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          last_ack_status: status,
          last_ack_at: new Date().toISOString(),
          traceId
        }
      } as any)
      .eq("message_id", messageId)
      .select('id');

    if (updateError) {
      await logEvent({
        instance,
        messageId,
        event: "ack_processing_error",
        status: "error",
        errorDetail: updateError.message,
        payload: { traceId, status }
      });
    } else if (updateData && updateData.length > 0) {
      logger.info("FOLLOWUP_ACK_UPDATED", `Status do followup ${updateData[0].id} atualizado para ${newStatus}`, {
        traceId,
        job_id: updateData[0].id,
        messageId,
        newStatus
      });
    }

  } catch (error: any) {
    logger.error("ACK_PROCESS_CRASH", error.message, { traceId, messageId });
  }
}
