import { EvolutionEventName, NormalizedEvolutionEvent } from "./types";

export function normalizeEvolutionEvent(payload: any): NormalizedEvolutionEvent {
  const rawEvent = String(
    payload?.event ?? payload?.type ?? payload?.eventType ?? payload?.data?.event ?? "unknown"
  )
    .toLowerCase()
    .replace(/_/g, ".");
  let eventName: EvolutionEventName = "unknown";

  if (
    rawEvent === "messages.upsert" || 
    rawEvent === "message.upsert" || 
    rawEvent === "messages_upsert" || 
    rawEvent === "message_upsert"
  ) {
    eventName = "messages.upsert";
  } else if (
    rawEvent === "connection.update" || 
    rawEvent === "connection_update"
  ) {
    eventName = "connection.update";
  } else if (
    rawEvent === "messages.ack" || 
    rawEvent === "message.ack" || 
    rawEvent === "messages_ack" || 
    rawEvent === "message_ack"
  ) {
    eventName = "messages.ack";
  }

  const instance = payload.instance || payload.instanceName || payload.data?.instance || payload.data?.instanceName || "unknown";
  const data = payload.data || payload;

  return {
    event: eventName,
    instance,
    data,
    payload
  };
}
