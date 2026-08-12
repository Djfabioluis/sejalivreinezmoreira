export type EvolutionEventName = "messages.upsert" | "connection.update" | "messages.ack" | "unknown";

export interface NormalizedEvolutionMessage {
  instance: string;
  remoteJid: string;
  remoteJidAlt?: string;
  messageId: string;
  pushName?: string;
  message: any;
  timestamp: number;
  fromMe: boolean;
  participant?: string;
  participantAlt?: string;
  senderPn?: string;
  senderLid?: string;
}

export interface NormalizedEvolutionEvent {
  event: EvolutionEventName;
  instance: string;
  data: any;
  payload: any;
}

export interface AIContext {
  contactName?: string;
  contactPhone: string;
  instance: string;
  agentId?: string;
  unidadeId?: string;
  unitName?: string;
  customerContext?: any;
  history: any[];
}

export interface ProcessingResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}

export const ErrorCodes = {
  UNAUTHORIZED: "unauthorized",
  INVALID_PAYLOAD: "invalid_payload",
  DUPLICATE: "duplicate_message",
  AGENT_NOT_FOUND: "agent_not_found",
  MISSING_UNIT: "agent_without_unit",
  RPC_ERROR: "rpc_error",
  AI_ERROR: "ai_error",
  EVOLUTION_ERROR: "evolution_error",
};
