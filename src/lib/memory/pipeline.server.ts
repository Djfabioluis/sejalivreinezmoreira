import { buildMemoryPromptBlock } from "./prompt";
import { extractCustomerMemory } from "./extract.server";
import {
  ensureCustomerMemory,
  loadCustomerMemory,
  persistExtractedMemory,
  recordAppointmentLearning,
} from "./store.server";
import { registerKnowledgeSuggestion } from "./learning.server";
import { normalizeMemoryPhone, resolveOrgKey } from "./identity";
import type { CustomerMemoryRow } from "./types";

/** Carrega a memória permanente e monta o bloco de prompt antes de chamar a IA. */
export async function loadMemoryForAgent(params: {
  phone: string;
  instance?: string | null;
  contactName?: string | null;
  bempCustomerId?: string | null;
}): Promise<{ memory: CustomerMemoryRow | null; promptBlock: string }> {
  try {
    const memory = await ensureCustomerMemory({
      phone: params.phone,
      phoneNumber: params.phone,
      orgKey: resolveOrgKey(params.instance),
      contactName: params.contactName ?? null,
      bempCustomerId: params.bempCustomerId ?? null,
    });
    return { memory, promptBlock: buildMemoryPromptBlock(memory) };
  } catch (error) {
    console.warn("[memory] falha ao carregar memória:", error instanceof Error ? error.message : String(error));
    return { memory: null, promptBlock: "" };
  }
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function weekdayOf(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return WEEKDAYS[date.getDay()] ?? null;
}

function timeRangeOf(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(date),
  );
  if (hour < 12) return "manhã";
  if (hour < 18) return "tarde";
  return "noite";
}

/** Aprende com agendamentos confirmados nos últimos minutos para este telefone. */
async function learnFromRecentAppointments(params: { phone: string; instance?: string | null }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const digits = normalizeMemoryPhone(params.phone);
  if (!digits) return;

  const { data } = await supabaseAdmin
    .from("agendamentos_notif" as never)
    .select("bemp_appointment_id, salon_id, service_name, professional_name, start_at, phone, created_at")
    .gte("created_at", since)
    .ilike("phone", `%${digits.slice(-8)}%`)
    .limit(3);

  for (const row of ((data ?? []) as unknown[]) as Array<Record<string, string | null>>) {
    await recordAppointmentLearning({
      lookup: { phone: digits, orgKey: resolveOrgKey(params.instance) },
      entry: {
        appointmentId: row["bemp_appointment_id"] ?? null,
        service: row["service_name"] ?? null,
        professional: row["professional_name"] ?? null,
        unitId: row["salon_id"] ?? null,
        weekday: row["start_at"] ? weekdayOf(row["start_at"]) : null,
        timeRange: row["start_at"] ? timeRangeOf(row["start_at"]) : null,
        outcome: "confirmado",
        source: "appointment_confirmed",
      },
    });
  }
}

/**
 * Executado após cada interação concluída: extrai, valida e mescla a memória.
 * Falhas aqui nunca interrompem o atendimento.
 */
export async function learnFromInteraction(params: {
  phone: string;
  instance?: string | null;
  conversationKey?: string | null;
  contactName?: string | null;
  newMessage: string;
  assistantReply?: string | null;
  recentHistory?: Array<{ role: string; text: string }>;
  customerContext?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const orgKey = resolveOrgKey(params.instance);
    const memory =
      (await loadCustomerMemory({ phone: params.phone, orgKey })) ??
      (await ensureCustomerMemory({
        phone: params.phone,
        phoneNumber: params.phone,
        orgKey,
        contactName: params.contactName ?? null,
      }));
    if (!memory) return;

    const extracted = await extractCustomerMemory({
      newMessage: params.newMessage,
      assistantReply: params.assistantReply ?? null,
      recentHistory: params.recentHistory ?? [],
      existingMemory: memory,
      toolResults: params.customerContext ?? null,
    });

    await persistExtractedMemory({ memory, extracted, reason: "aprendizado da conversa" });

    if (extracted.knowledgeSuggestion) {
      await registerKnowledgeSuggestion({
        category: extracted.knowledgeSuggestion.category,
        title: extracted.knowledgeSuggestion.title,
        suggestedContent: extracted.knowledgeSuggestion.suggestedContent,
        evidenceSummary: extracted.knowledgeSuggestion.evidenceSummary,
        confidence: extracted.knowledgeSuggestion.confidence,
        conversationId: params.conversationKey ?? null,
      });
    }

    await learnFromRecentAppointments({ phone: params.phone, instance: params.instance });
  } catch (error) {
    console.warn("[memory] aprendizado ignorado:", error instanceof Error ? error.message : String(error));
  }
}
