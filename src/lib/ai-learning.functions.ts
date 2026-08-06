import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "@/lib/permissions.functions";
import { MEMORY_FIELDS } from "@/lib/memory/types";

const PERM = "aprendizado-ia" as const;

export type CustomerMemoryListItem = {
  id: string;
  org_key: string;
  bemp_customer_id: string | null;
  phone_normalized: string;
  contact_name: string | null;
  preferred_name: string | null;
  preferred_unit_id: string | null;
  preferred_services: string[];
  preferred_professionals: string[];
  preferred_days: string[];
  preferred_times: string[];
  restrictions: string[];
  pending_topics: string[];
  important_notes: string[];
  subscription_summary: Record<string, any>;
  appointment_summary: any[];
  field_sources: Record<string, { source: string; confidence: number; updated_at: string }>;
  memory_summary: string | null;
  memory_version: number;
  confidence_score: number;
  last_interaction_at: string | null;
  anonymized_at: string | null;
  updated_at: string;
};

export const listCustomerMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        minConfidence: z.number().min(0).max(1).default(0),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("customer_ai_memory" as never)
      .select("*")
      .gte("confidence_score", data.minConfidence)
      .order("last_interaction_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);

    if (data.search) {
      const term = safeIlikePattern(data.search);
      query = query.or(
        `phone_normalized.ilike.${term},contact_name.ilike.${term},preferred_name.ilike.${term},bemp_customer_id.ilike.${term}`,
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as CustomerMemoryListItem[];
  });

export const getMemoryVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memoryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("customer_ai_memory_versions" as never)
      .select("id, memory_id, version, change_reason, changed_by_source, created_at, snapshot")
      .eq("memory_id", data.memoryId)
      .order("version", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as Array<{
      id: string;
      memory_id: string;
      version: number;
      change_reason: string | null;
      changed_by_source: string | null;
      created_at: string;
      snapshot: Record<string, any>;
    }>;
  });

export const listMemoryChangeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("customer_ai_memory_versions" as never)
      .select("id, memory_id, version, change_reason, changed_by_source, created_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string;
      memory_id: string;
      version: number;
      change_reason: string | null;
      changed_by_source: string | null;
      created_at: string;
    }>;
  });

const MemoryFieldEnum = z.enum(MEMORY_FIELDS);

export const updateMemoryField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        memoryId: z.string().uuid(),
        field: MemoryFieldEnum,
        value: z.union([z.string().max(240), z.array(z.string().max(240)).max(12)]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("customer_ai_memory" as never)
      .select("*")
      .eq("id", data.memoryId)
      .maybeSingle();
    if (!row) throw new Error("Memória não encontrada.");

    const { applyMemoryPatch } = await import("@/lib/memory/store.server");
    const { FIELD_COLUMN } = await import("@/lib/memory/types");
    const memory = row as any;
    const column = FIELD_COLUMN[data.field];
    const now = new Date().toISOString();

    await applyMemoryPatch({
      memory,
      patch: {
        [column]: data.value,
        field_sources: {
          ...(memory.field_sources ?? {}),
          [data.field]: { source: "operator_confirmed", confidence: 1, updated_at: now },
        },
        memory_version: (memory.memory_version ?? 1) + 1,
      },
      changes: [
        { field: data.field, before: memory[column], after: data.value, source: "operator_confirmed", confidence: 1 },
      ],
      reason: "correção manual do administrador",
      changedBy: context.userId,
      changedBySource: "admin",
    });
    return { ok: true };
  });

export const removeMemoryField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ memoryId: z.string().uuid(), field: MemoryFieldEnum }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { deleteMemoryField } = await import("@/lib/memory/store.server");
    await deleteMemoryField(data.memoryId, data.field, context.userId);
    return { ok: true };
  });

export const forgetMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memoryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { forgetCustomerMemory } = await import("@/lib/memory/store.server");
    return forgetCustomerMemory(data.memoryId, context.userId);
  });

export const anonymizeMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memoryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { anonymizeCustomerMemory } = await import("@/lib/memory/store.server");
    await anonymizeCustomerMemory(data.memoryId, context.userId);
    return { ok: true };
  });

export const restoreMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ versionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { restoreMemoryVersion } = await import("@/lib/memory/store.server");
    await restoreMemoryVersion(data.versionId, context.userId);
    return { ok: true };
  });

export type KnowledgeSuggestion = {
  id: string;
  source_conversation_id: string | null;
  category: string;
  title: string;
  suggested_content: string;
  evidence_summary: string | null;
  occurrence_count: number;
  confidence_score: number;
  status: "pending" | "approved" | "rejected" | "published";
  reviewed_at: string | null;
  created_at: string;
};

export const listKnowledgeSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ status: z.enum(["all", "pending", "approved", "rejected", "published"]).default("all") })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("knowledge_suggestions" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as KnowledgeSuggestion[];
  });

export const reviewKnowledgeSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject", "publish"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "publish") {
      // Publicar exige aprovação humana explícita: só aqui a base global é alterada.
      const { data: row } = await supabaseAdmin
        .from("knowledge_suggestions" as never)
        .select("title, suggested_content, status")
        .eq("id", data.id)
        .maybeSingle();
      const suggestion = row as { title: string; suggested_content: string; status: string } | null;
      if (!suggestion) throw new Error("Sugestão não encontrada.");
      if (suggestion.status !== "approved") throw new Error("Aprove a sugestão antes de publicar.");

      const { data: kb } = await supabaseAdmin
        .from("base_conhecimento" as never)
        .select("conteudo")
        .eq("id", 1)
        .maybeSingle();
      const atual = ((kb as { conteudo?: string } | null)?.conteudo ?? "").trim();
      const novo = `${atual}\n\n${suggestion.title}\n${suggestion.suggested_content}`.trim().slice(0, 20000);
      const { error: kbErr } = await supabaseAdmin
        .from("base_conhecimento" as never)
        .upsert({ id: 1, conteudo: novo, updated_at: new Date().toISOString() } as never);
      if (kbErr) throw new Error(kbErr.message);
    }

    const status = data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "published";
    const { error } = await supabaseAdmin
      .from("knowledge_suggestions" as never)
      .update({ status, reviewed_by: context.userId, reviewed_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, status };
  });

export type AiFeedback = {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  response_id: string | null;
  rating: number | null;
  feedback_type: string;
  corrected_answer: string | null;
  operator_notes: string | null;
  created_at: string;
};

export const listAiFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_response_feedback" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AiFeedback[];
  });

export const createAiFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversationId: z.string().trim().max(200).optional().nullable(),
        messageId: z.string().trim().max(200).optional().nullable(),
        responseId: z.string().trim().max(200).optional().nullable(),
        rating: z.number().int().min(1).max(5).optional().nullable(),
        feedbackType: z.enum([
          "helpful",
          "incorrect",
          "repetitive",
          "wrong_unit",
          "wrong_professional",
          "wrong_service",
          "wrong_plan",
          "formatting_issue",
          "duplicate_response",
          "other",
        ]),
        correctedAnswer: z.string().trim().max(2000).optional().nullable(),
        operatorNotes: z.string().trim().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, PERM);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_response_feedback" as never).insert({
      conversation_id: data.conversationId ?? null,
      message_id: data.messageId ?? null,
      response_id: data.responseId ?? null,
      rating: data.rating ?? null,
      feedback_type: data.feedbackType,
      corrected_answer: data.correctedAnswer ?? null,
      operator_notes: data.operatorNotes ?? null,
      created_by: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLearningMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, PERM);
    const { runLearningPatternDetection } = await import("@/lib/memory/learning.server");
    return runLearningPatternDetection(14);
  });
