import { EvolutionEventName, NormalizedEvolutionEvent } from "./types";

export function normalizeEvolutionEvent(payload: any): NormalizedEvolutionEvent {
  const rawEvent = (payload.event || "unknown").toLowerCase().replace(/_/g, ".");
  let eventName: EvolutionEventName = "unknown";

  if (rawEvent.includes("messages.upsert") || rawEvent.includes("message.upsert")) {
    eventName = "messages.upsert";
  } else if (rawEvent.includes("connection.update")) {
    eventName = "connection.update";
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
