import { z } from "zod";
/** Origens possíveis de um dado de memória, em ordem de confiança. */
export const MEMORY_SOURCES = [
    "bemp_confirmed",
    "operator_confirmed",
    "appointment_confirmed",
    "explicit_customer_statement",
    "inferred",
];
/** Peso de cada origem: dado confirmado nunca é sobrescrito por dado inferido. */
export const SOURCE_WEIGHT = {
    bemp_confirmed: 100,
    operator_confirmed: 90,
    appointment_confirmed: 80,
    explicit_customer_statement: 70,
    inferred: 10,
};
export function isConfirmedSource(source) {
    return source !== "inferred";
}
/** Campos escalares (texto simples). */
export const SCALAR_FIELDS = ["preferredName", "preferredUnitId", "contactName"];
/** Campos de lista (arrays de strings, deduplicados). */
export const LIST_FIELDS = [
    "preferredServices",
    "preferredProfessionals",
    "preferredDays",
    "preferredTimes",
    "restrictions",
    "importantNotes",
    "pendingTopics",
];
/** Campos de objeto (mesclados chave a chave). */
export const OBJECT_FIELDS = ["communicationPreferences", "subscriptionSummary"];
export const MEMORY_FIELDS = [...SCALAR_FIELDS, ...LIST_FIELDS, ...OBJECT_FIELDS];
/** Mapeamento campo lógico → coluna da tabela customer_ai_memory. */
export const FIELD_COLUMN = {
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
