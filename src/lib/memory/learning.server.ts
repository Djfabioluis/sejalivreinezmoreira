import { maskSensitive } from "./identity";

const SUGGESTIONS_TABLE = "knowledge_suggestions";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Conteúdos que NUNCA podem virar sugestão para a base global. */
const BLOCKED_SUGGESTION_PATTERNS: RegExp[] = [
  /gr[áa]tis|de gra[çc]a|sem custo/i,
  /desconto de \d+%/i,
  /r\$\s?\d/i,
  /altere? (o )?(prompt|sistema|regra)/i,
  /ignore (as )?(regras|instru[çc][õo]es)/i,
  /nova (regra|pol[íi]tica)/i,
  /senha|token|cart[ãa]o/i,
];

export function isBlockedSuggestion(text: string): boolean {
  return BLOCKED_SUGGESTION_PATTERNS.some((re) => re.test(text));
}

/**
 * Registra uma sugestão para a base de conhecimento global.
 * Nunca publica automaticamente: entra sempre como "pending" para revisão do admin.
 * Sugestões repetidas incrementam occurrence_count em vez de duplicar.
 */
export async function registerKnowledgeSuggestion(params: {
  category: string;
  title: string;
  suggestedContent: string;
  evidenceSummary?: string;
  confidence?: number;
  conversationId?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const title = maskSensitive(params.title).trim().slice(0, 160);
  const content = maskSensitive(params.suggestedContent).trim().slice(0, 2000);
  if (!title || !content) return { ok: false, reason: "conteúdo vazio" };
  if (isBlockedSuggestion(`${title}\n${content}`)) return { ok: false, reason: "conteúdo bloqueado" };

  const db = await admin();
  const { data: existing } = await db
    .from(SUGGESTIONS_TABLE as never)
    .select("id, occurrence_count, confidence_score")
    .ilike("title", title)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  const row = existing as { id: string; occurrence_count: number; confidence_score: number } | null;
  if (row) {
    await db
      .from(SUGGESTIONS_TABLE as never)
      .update({
        occurrence_count: (row.occurrence_count ?? 1) + 1,
        confidence_score: Math.max(Number(row.confidence_score ?? 0), params.confidence ?? 0.4),
      } as never)
      .eq("id", row.id);
    return { ok: true };
  }

  const { error } = await db.from(SUGGESTIONS_TABLE as never).insert({
    source_conversation_id: params.conversationId ?? null,
    category: (params.category || "geral").slice(0, 60),
    title,
    suggested_content: content,
    evidence_summary: maskSensitive(params.evidenceSummary ?? "").slice(0, 600),
    confidence_score: params.confidence ?? 0.4,
    status: "pending",
  } as never);

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export type LearningMetrics = {
  memories: number;
  memoriesWithHighConfidence: number;
  suggestionsPending: number;
  suggestionsApproved: number;
  feedbackTotal: number;
  feedbackByType: Array<{ type: string; count: number }>;
  humanHandoffs: number;
  transfers: number;
  aiFailures: number;
  generatedAt: string;
};

/** Detecção periódica de padrões: gera métricas e sugestões, nunca altera regras. */
export async function runLearningPatternDetection(days = 14): Promise<LearningMetrics> {
  const db = await admin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [memories, suggestions, feedback, handoffs, transfers, failures] = await Promise.all([
    db.from("customer_ai_memory" as never).select("confidence_score"),
    db.from(SUGGESTIONS_TABLE as never).select("status"),
    db.from("ai_response_feedback" as never).select("feedback_type").gte("created_at", since),
    db.from("atendimentos_humanos" as never).select("id").gte("created_at", since),
    db.from("wa_conversas" as never).select("phone").not("transferred_at", "is", null),
    db
      .from("evo_webhook_logs" as never)
      .select("id")
      .eq("status", "error")
      .gte("created_at", since),
  ]);

  const memoryRows = (memories.data ?? []) as Array<{ confidence_score: number }>;
  const suggestionRows = (suggestions.data ?? []) as Array<{ status: string }>;
  const feedbackRows = (feedback.data ?? []) as Array<{ feedback_type: string }>;

  const byType = new Map<string, number>();
  for (const row of feedbackRows) byType.set(row.feedback_type, (byType.get(row.feedback_type) ?? 0) + 1);

  const metrics: LearningMetrics = {
    memories: memoryRows.length,
    memoriesWithHighConfidence: memoryRows.filter((m) => Number(m.confidence_score ?? 0) >= 0.6).length,
    suggestionsPending: suggestionRows.filter((s) => s.status === "pending").length,
    suggestionsApproved: suggestionRows.filter((s) => s.status === "approved").length,
    feedbackTotal: feedbackRows.length,
    feedbackByType: Array.from(byType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    humanHandoffs: (handoffs.data ?? []).length,
    transfers: (transfers.data ?? []).length,
    aiFailures: (failures.data ?? []).length,
    generatedAt: new Date().toISOString(),
  };

  // Padrões recorrentes viram sugestões pendentes de revisão (nunca regras automáticas).
  for (const { type, count } of metrics.feedbackByType) {
    if (count < 3 || type === "helpful") continue;
    await registerKnowledgeSuggestion({
      category: "qualidade-da-ia",
      title: `Padrão recorrente de feedback: ${type}`,
      suggestedContent: `Foram registrados ${count} feedbacks do tipo "${type}" nos últimos ${days} dias. Revisar as instruções relacionadas e validar com um administrador antes de publicar qualquer mudança.`,
      evidenceSummary: `Base: tabela ai_response_feedback, janela de ${days} dias.`,
      confidence: Math.min(0.9, 0.3 + count / 20),
    });
  }

  if (metrics.humanHandoffs >= 5) {
    await registerKnowledgeSuggestion({
      category: "atendimento-humano",
      title: "Volume relevante de encaminhamentos para atendimento humano",
      suggestedContent: `Houve ${metrics.humanHandoffs} encaminhamentos para atendimento humano nos últimos ${days} dias. Avaliar quais dúvidas a IA não conseguiu resolver e considerar incluir orientação na base de conhecimento.`,
      evidenceSummary: "Base: tabela atendimentos_humanos.",
      confidence: 0.5,
    });
  }

  return metrics;
}
