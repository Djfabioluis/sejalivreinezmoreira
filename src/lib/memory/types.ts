import { z } from "zod";

/** Origens possíveis de um dado de memória, em ordem de confiança. */
export const MEMORY_SOURCES = [
  "bemp_confirmed",
  "operator_confirmed",
  "appointment_confirmed",
  "explicit_customer_statement",
  "inferred",
] as const;

export type MemorySource = (typeof MEMORY_SOURCES)[number];

/** Peso de cada origem: dado confirmado nunca é sobrescrito por dado inferido. */
export const SOURCE_WEIGHT: Record<MemorySource, number> = {
  bemp_confirmed: 100,
  operator_confirmed: 90,
  appointment_confirmed: 80,
  explicit_customer_statement: 70,
  inferred: 10,
};

export function isConfirmedSource(source: MemorySource): boolean {
  return source !== "inferred";
}

/** Campos escalares (texto simples). */
export const SCALAR_FIELDS = ["preferredName", "preferredUnitId", "contactName"] as const;

/** Campos de lista (arrays de strings, deduplicados). */
export const LIST_FIELDS = [
  "preferredServices",
  "preferredProfessionals",
  "preferredDays",
  "preferredTimes",
  "restrictions",
  "importantNotes",
  "pendingTopics",
] as const;

/** Campos de objeto (mesclados chave a chave). */
export const OBJECT_FIELDS = ["communicationPreferences", "subscriptionSummary"] as const;

export const MEMORY_FIELDS = [...SCALAR_FIELDS, ...LIST_FIELDS, ...OBJECT_FIELDS] as const;
export type MemoryField = (typeof MEMORY_FIELDS)[number];

/** Mapeamento campo lógico → coluna da tabela customer_ai_memory. */
export const FIELD_COLUMN: Record<MemoryField, string> = {
  preferredName: "preferred_name",
  preferredUnitId: "preferred_unit_id",
  contactName: "contact_name",
  preferredServices: "preferred_services",
  preferredProfessionals: "preferred_professionals",
  preferredDays: "preferred_days",
  preferredTimes: "preferred_times",
  restrictions: "restrictions",
  importantNotes: "important_notes",
  pendingTopics: "pending_topics",
  communicationPreferences: "communication_preferences",
  subscriptionSummary: "subscription_summary",
};

/** Limites de tamanho para evitar crescimento indefinido da memória. */
export const MAX_LIST_ITEMS = 12;
export const MAX_TEXT_LENGTH = 240;
export const MAX_SUMMARY_LENGTH = 800;
export const MAX_APPOINTMENT_HISTORY = 30;
/** Nº de ocorrências no histórico para sugerir uma preferência automática. */
export const RECURRENCE_THRESHOLD = 3;

export const MemoryFactSchema = z.object({
  field: z.enum(MEMORY_FIELDS),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.record(z.string(), z.any())]),
  operation: z.enum(["set", "add", "remove"]).default("set"),
  source: z.enum(MEMORY_SOURCES),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type MemoryFact = z.infer<typeof MemoryFactSchema>;

export const ExtractionSchema = z.object({
  facts: z.array(MemoryFactSchema).max(20).default([]),
  pendingTopics: z.array(z.string()).max(10).default([]),
  suggestedSummary: z.string().max(MAX_SUMMARY_LENGTH).default(""),
  corrections: z
    .array(z.object({ field: z.enum(MEMORY_FIELDS), removeValue: z.string() }))
    .max(10)
    .default([]),
  knowledgeSuggestion: z
    .object({
      category: z.string().max(60),
      title: z.string().max(160),
      suggestedContent: z.string().max(2000),
      evidenceSummary: z.string().max(600).default(""),
      confidence: z.number().min(0).max(1).default(0.4),
    })
    .nullable()
    .default(null),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

/** Registro de origem por campo. */
export type FieldSourceEntry = {
  source: MemorySource;
  confidence: number;
  updated_at: string;
};

export type CustomerMemoryRow = {
  id: string;
  org_key: string;
  bemp_customer_id: string | null;
  phone_normalized: string;
  phone_number: string | null;
  contact_name: string | null;
  preferred_name: string | null;
  preferred_unit_id: string | null;
  preferred_services: string[];
  preferred_professionals: string[];
  preferred_days: string[];
  preferred_times: string[];
  communication_preferences: Record<string, unknown>;
  restrictions: string[];
  subscription_summary: Record<string, unknown>;
  appointment_summary: AppointmentMemoryEntry[];
  important_notes: string[];
  pending_topics: string[];
  field_sources: Record<string, FieldSourceEntry>;
  memory_summary: string | null;
  memory_version: number;
  confidence_score: number;
  last_interaction_at: string | null;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentMemoryEntry = {
  appointmentId?: string | null;
  service?: string | null;
  professional?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  weekday?: string | null;
  timeRange?: string | null;
  plan?: string | null;
  outcome?: string | null;
  source?: MemorySource;
  at: string;
};

export const ConversationSummarySchema = z.object({
  outcome: z.string().max(120).default("indefinido"),
  service: z.string().max(120).nullable().default(null),
  unit: z.string().max(120).nullable().default(null),
  professional: z.string().max(120).nullable().default(null),
  appointmentId: z.string().max(120).nullable().default(null),
  customerPreferencesLearned: z.array(z.string()).max(10).default([]),
  unresolvedIssues: z.array(z.string()).max(10).default([]),
  followUpNeeded: z.boolean().default(false),
});

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;
