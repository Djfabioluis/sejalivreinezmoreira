import {
  MAX_APPOINTMENT_HISTORY,
  RECURRENCE_THRESHOLD,
  type AppointmentMemoryEntry,
  type CustomerMemoryRow,
  type ExtractionResult,
  type MemoryField,
  FIELD_COLUMN,
} from "./types";
import { mergeCustomerMemory, type MemoryChange } from "./merge";
import { isForbiddenMemoryValue, normalizeMemoryPhone, resolveOrgKey } from "./identity";

const TABLE = "customer_ai_memory";
const VERSIONS_TABLE = "customer_ai_memory_versions";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type MemoryLookup = {
  phone?: string | null;
  bempCustomerId?: string | null;
  orgKey?: string | null;
  contactName?: string | null;
  phoneNumber?: string | null;
};

/** Localiza a memória do cliente: 1) ID do BEMP, 2) telefone normalizado. */
export async function loadCustomerMemory(lookup: MemoryLookup): Promise<CustomerMemoryRow | null> {
  const db = await admin();
  const orgKey = resolveOrgKey(lookup.orgKey);
  const phone = normalizeMemoryPhone(lookup.phone);

  if (lookup.bempCustomerId) {
    const { data } = await db
      .from(TABLE as never)
      .select("*")
      .eq("org_key", orgKey)
      .eq("bemp_customer_id", String(lookup.bempCustomerId))
      .maybeSingle();
    if (data) return data as unknown as CustomerMemoryRow;
  }

  if (phone) {
    const { data } = await db
      .from(TABLE as never)
      .select("*")
      .eq("org_key", orgKey)
      .eq("phone_normalized", phone)
      .maybeSingle();
    if (data) return data as unknown as CustomerMemoryRow;
  }

  return null;
}

/** Carrega ou cria (provisoriamente) a memória do cliente. */
export async function ensureCustomerMemory(lookup: MemoryLookup): Promise<CustomerMemoryRow | null> {
  const phone = normalizeMemoryPhone(lookup.phone);
  if (!phone && !lookup.bempCustomerId) return null;

  const existing = await loadCustomerMemory(lookup);
  if (existing) {
    // Vincula a memória provisória ao ID oficial do BEMP sem duplicar dados.
    if (lookup.bempCustomerId && !existing.bemp_customer_id) {
      const db = await admin();
      await db
        .from(TABLE as never)
        .update({ bemp_customer_id: String(lookup.bempCustomerId) } as never)
        .eq("id", existing.id);
      existing.bemp_customer_id = String(lookup.bempCustomerId);
    }
    return existing;
  }

  const db = await admin();
  const { data, error } = await db
    .from(TABLE as never)
    .insert({
      org_key: resolveOrgKey(lookup.orgKey),
      phone_normalized: phone,
      phone_number: lookup.phoneNumber ?? phone,
      bemp_customer_id: lookup.bempCustomerId ? String(lookup.bempCustomerId) : null,
      contact_name: lookup.contactName ?? null,
      last_interaction_at: new Date().toISOString(),
    } as never)
    .select("*")
    .maybeSingle();

  if (error) {
    // Corrida entre webhooks: recarrega a memória já criada.
    return await loadCustomerMemory(lookup);
  }
  return (data as unknown as CustomerMemoryRow) ?? null;
}

async function saveVersionSnapshot(
  memory: CustomerMemoryRow,
  reason: string,
  changedBy?: string | null,
  changedBySource = "ai",
) {
  const db = await admin();
  await db.from(VERSIONS_TABLE as never).insert({
    memory_id: memory.id,
    version: memory.memory_version ?? 1,
    snapshot: memory as unknown as Record<string, unknown>,
    change_reason: reason.slice(0, 400),
    changed_by: changedBy ?? null,
    changed_by_source: changedBySource,
  } as never);
}

/** Aplica um patch na memória, versionando o estado anterior. */
export async function applyMemoryPatch(params: {
  memory: CustomerMemoryRow;
  patch: Record<string, unknown>;
  changes: MemoryChange[];
  reason: string;
  changedBy?: string | null;
  changedBySource?: string;
}): Promise<CustomerMemoryRow | null> {
  const { memory, patch, changes, reason } = params;
  if (Object.keys(patch).length === 0) return memory;

  const db = await admin();
  if (changes.length > 0) {
    await saveVersionSnapshot(memory, reason, params.changedBy, params.changedBySource ?? "ai");
  }

  const { data, error } = await db
    .from(TABLE as never)
    .update(patch as never)
    .eq("id", memory.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[memory] falha ao salvar memória:", error.message);
    return memory;
  }
  return (data as unknown as CustomerMemoryRow) ?? memory;
}

/** Merge + persistência do resultado da extração. */
export async function persistExtractedMemory(params: {
  memory: CustomerMemoryRow;
  extracted: ExtractionResult;
  reason?: string;
}): Promise<{ memory: CustomerMemoryRow | null; changes: MemoryChange[] }> {
  const safeExtracted: ExtractionResult = {
    ...params.extracted,
    facts: (params.extracted.facts ?? []).filter((fact) => !isForbiddenMemoryValue(fact.value)),
    pendingTopics: (params.extracted.pendingTopics ?? []).filter((topic) => !isForbiddenMemoryValue(topic)),
  };

  const { patch, changes } = mergeCustomerMemory(params.memory, safeExtracted);
  const memory = await applyMemoryPatch({
    memory: params.memory,
    patch,
    changes,
    reason: params.reason ?? "aprendizado automático da conversa",
    changedBySource: "ai",
  });
  return { memory, changes };
}

/**
 * Registra um agendamento confirmado no histórico da memória e sugere
 * preferências somente após recorrência (3+ ocorrências).
 */
export async function recordAppointmentLearning(params: {
  lookup: MemoryLookup;
  entry: Omit<AppointmentMemoryEntry, "at">;
}): Promise<void> {
  const memory = await ensureCustomerMemory(params.lookup);
  if (!memory) return;

  const entry: AppointmentMemoryEntry = {
    ...params.entry,
    source: params.entry.source ?? "appointment_confirmed",
    at: new Date().toISOString(),
  };
  const history = [entry, ...(memory.appointment_summary ?? [])].slice(0, MAX_APPOINTMENT_HISTORY);

  const patch: Record<string, unknown> = {
    appointment_summary: history,
    last_interaction_at: entry.at,
  };
  const changes: MemoryChange[] = [
    {
      field: "importantNotes",
      before: memory.appointment_summary?.length ?? 0,
      after: history.length,
      source: "appointment_confirmed",
      confidence: 1,
    },
  ];

  const suggestFromRecurrence = (
    getter: (item: AppointmentMemoryEntry) => string | null | undefined,
    field: MemoryField,
  ) => {
    const value = getter(entry);
    if (!value) return;
    const count = history.filter((item) => {
      const other = getter(item);
      return other && other.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR");
    }).length;
    if (count < RECURRENCE_THRESHOLD) return;
    const column = FIELD_COLUMN[field];
    const current = ((patch[column] as string[]) ?? (memory as unknown as Record<string, unknown>)[column] ?? []) as string[];
    if (current.some((item) => item.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"))) return;
    patch[column] = [value, ...current].slice(0, 12);
    changes.push({ field, before: current, after: patch[column], source: "appointment_confirmed", confidence: 0.85 });
  };

  suggestFromRecurrence((item) => item.professional, "preferredProfessionals");
  suggestFromRecurrence((item) => item.service, "preferredServices");
  suggestFromRecurrence((item) => item.weekday, "preferredDays");
  suggestFromRecurrence((item) => item.timeRange, "preferredTimes");

  if (entry.unitId) patch["preferred_unit_id"] = memory.preferred_unit_id ?? entry.unitId;

  await applyMemoryPatch({
    memory,
    patch,
    changes,
    reason: "agendamento confirmado",
    changedBySource: "appointment",
  });
}

/** Atualiza o resumo de plano/assinatura com dados confirmados pelo BEMP. */
export async function recordSubscriptionSnapshot(params: {
  lookup: MemoryLookup;
  summary: Record<string, unknown>;
}): Promise<void> {
  const memory = await ensureCustomerMemory(params.lookup);
  if (!memory) return;
  await applyMemoryPatch({
    memory,
    patch: {
      subscription_summary: params.summary,
      field_sources: {
        ...(memory.field_sources ?? {}),
        subscriptionSummary: { source: "bemp_confirmed", confidence: 1, updated_at: new Date().toISOString() },
      },
      memory_version: (memory.memory_version ?? 1) + 1,
      last_interaction_at: new Date().toISOString(),
    },
    changes: [
      {
        field: "subscriptionSummary",
        before: memory.subscription_summary ?? {},
        after: params.summary,
        source: "bemp_confirmed",
        confidence: 1,
      },
    ],
    reason: "plano confirmado pelo BEMP",
    changedBySource: "bemp",
  });
}

/** Remove um campo específico da memória (fluxo autorizado). */
export async function deleteMemoryField(memoryId: string, field: MemoryField, changedBy?: string | null) {
  const db = await admin();
  const { data } = await db.from(TABLE as never).select("*").eq("id", memoryId).maybeSingle();
  const memory = data as unknown as CustomerMemoryRow | null;
  if (!memory) throw new Error("Memória não encontrada.");

  const column = FIELD_COLUMN[field];
  const emptyValue = Array.isArray((memory as unknown as Record<string, unknown>)[column])
    ? []
    : typeof (memory as unknown as Record<string, unknown>)[column] === "object" &&
        (memory as unknown as Record<string, unknown>)[column] !== null
      ? {}
      : null;

  const fieldSources = { ...(memory.field_sources ?? {}) };
  delete fieldSources[field];

  return applyMemoryPatch({
    memory,
    patch: { [column]: emptyValue, field_sources: fieldSources, memory_version: (memory.memory_version ?? 1) + 1 },
    changes: [
      {
        field,
        before: (memory as unknown as Record<string, unknown>)[column],
        after: emptyValue,
        source: "operator_confirmed",
        confidence: 1,
      },
    ],
    reason: `campo ${field} removido pelo administrador`,
    changedBy,
    changedBySource: "admin",
  });
}

/** Apaga toda a memória de IA do cliente (não afeta dados do BEMP). */
export async function forgetCustomerMemory(memoryId: string, changedBy?: string | null) {
  const db = await admin();
  const { data } = await db.from(TABLE as never).select("*").eq("id", memoryId).maybeSingle();
  const memory = data as unknown as CustomerMemoryRow | null;
  if (!memory) throw new Error("Memória não encontrada.");
  await saveVersionSnapshot(memory, "memória apagada pelo administrador", changedBy, "admin");
  await db.from(TABLE as never).delete().eq("id", memoryId);
  return { ok: true };
}

/** Anonimiza a memória mantendo apenas estatísticas não identificáveis. */
export async function anonymizeCustomerMemory(memoryId: string, changedBy?: string | null) {
  const db = await admin();
  const { data } = await db.from(TABLE as never).select("*").eq("id", memoryId).maybeSingle();
  const memory = data as unknown as CustomerMemoryRow | null;
  if (!memory) throw new Error("Memória não encontrada.");

  return applyMemoryPatch({
    memory,
    patch: {
      contact_name: null,
      preferred_name: null,
      phone_number: null,
      phone_normalized: `anon-${memory.id.slice(0, 8)}`,
      bemp_customer_id: null,
      important_notes: [],
      pending_topics: [],
      restrictions: [],
      memory_summary: null,
      anonymized_at: new Date().toISOString(),
      memory_version: (memory.memory_version ?? 1) + 1,
    },
    changes: [
      { field: "preferredName", before: memory.preferred_name, after: null, source: "operator_confirmed", confidence: 1 },
    ],
    reason: "memória anonimizada pelo administrador",
    changedBy,
    changedBySource: "admin",
  });
}

/** Restaura uma versão anterior da memória. */
export async function restoreMemoryVersion(versionId: string, changedBy?: string | null) {
  const db = await admin();
  const { data: versionRow } = await db
    .from(VERSIONS_TABLE as never)
    .select("*")
    .eq("id", versionId)
    .maybeSingle();
  const version = versionRow as unknown as { memory_id: string; snapshot: Record<string, unknown> } | null;
  if (!version) throw new Error("Versão não encontrada.");

  const { data: currentRow } = await db.from(TABLE as never).select("*").eq("id", version.memory_id).maybeSingle();
  const current = currentRow as unknown as CustomerMemoryRow | null;
  if (!current) throw new Error("Memória não encontrada.");

  const snapshot = version.snapshot;
  const restorable = [
    "preferred_name",
    "preferred_unit_id",
    "preferred_services",
    "preferred_professionals",
    "preferred_days",
    "preferred_times",
    "communication_preferences",
    "restrictions",
    "subscription_summary",
    "important_notes",
    "pending_topics",
    "field_sources",
    "memory_summary",
  ];
  const patch: Record<string, unknown> = { memory_version: (current.memory_version ?? 1) + 1 };
  for (const key of restorable) {
    if (key in snapshot) patch[key] = snapshot[key];
  }

  return applyMemoryPatch({
    memory: current,
    patch,
    changes: [
      { field: "memory_summary", before: current.memory_summary, after: patch["memory_summary"], source: "operator_confirmed", confidence: 1 },
    ],
    reason: "versão anterior restaurada",
    changedBy,
    changedBySource: "admin",
  });
}
