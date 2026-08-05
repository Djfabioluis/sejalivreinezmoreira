export interface AgentOptions {
  sandbox?: boolean;
  contactName?: string | null;
  contactPhone?: string | null;
  instance?: string;
  unidadeId?: string;
  unitName?: string;
  customerContext?: any;
  conversationKey?: string;
  persona?: string;
  traceId?: string;
  messageId?: string | null;
  /** Bloco "MEMÓRIA CONFIRMADA DO CLIENTE" injetado no system prompt. */
  memoryBlock?: string;
}

