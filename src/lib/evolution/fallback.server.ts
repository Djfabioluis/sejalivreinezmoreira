import { sendEvolutionText } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
import { GENERIC_FALLBACK_TEXT, classifyFailure, sanitizeErrorText } from "./failure";

/**
 * Acionado quando a IA falha. A mensagem enviada depende da causa:
 * erros conhecidos recebem texto específico; a mensagem genérica de
 * "instabilidade" fica reservada a falhas inesperadas.
 */
export async function handleAIFallback(params: {
  instance: string;
  phone: string;
  conversationKey: string;
  messageId?: string;
  contactName?: string | null;
  reason?: string;
  /** Erro original (preferido) — permite classificar corretamente a causa. */
  error?: unknown;
}) {
  const failure = classifyFailure(params.error ?? params.reason ?? "");
  const text = failure.userMessage || GENERIC_FALLBACK_TEXT;
  const reason = sanitizeErrorText(params.reason ?? failure.code, 240);

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conv } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("status, contact_name")
      .eq("phone", params.conversationKey)
      .maybeSingle();

    const alreadyEscalated = (conv as { status?: string } | null)?.status === "aguardando_humano";

    if (failure.escalate) {
      await supabaseAdmin
        .from("wa_conversas" as never)
        .update({ status: "aguardando_humano" } as never)
        .eq("phone", params.conversationKey);
    }

    if (failure.escalate && alreadyEscalated) {
      await logEvent({
        instance: params.instance,
        messageId: params.messageId,
        event: "ai_fallback",
        status: "already_escalated",
        payload: { failureCode: failure.code },
      });
      return;
    }

    if (failure.escalate) {
      await supabaseAdmin.from("atendimentos_humanos" as never).insert({
        nome:
          params.contactName ?? (conv as { contact_name?: string } | null)?.contact_name ?? null,
        phone: params.phone,
        motivo: `IA indisponível (${failure.code}): ${reason || "erro desconhecido"}`.slice(0, 300),
        canal: "whatsapp",
        status: "aguardando",
      } as never);
    }

    const sent = await sendEvolutionText(params.instance, params.phone, text);

    if (sent) {
      await (
        supabaseAdmin.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<unknown>
      )("append_wa_message", {
        p_phone: params.conversationKey,
        p_new_message: {
          id: `fallback-${Date.now()}`,
          role: "assistant",
          parts: [{ type: "text", text }],
          createdAt: new Date().toISOString()
        }
      });
    }

    await logEvent({
      instance: params.instance,
      messageId: params.messageId,
      event: "ai_fallback",
      status: failure.escalate
        ? sent
          ? "escalated_to_human"
          : "escalated_send_failed"
        : sent
          ? "known_error_replied"
          : "known_error_send_failed",
      errorDetail: reason || null,
      payload: { failureCode: failure.code, expected: failure.expected },
    });
  } catch (err) {
    await logEvent({
      instance: params.instance,
      messageId: params.messageId,
      event: "ai_fallback",
      status: "error",
      errorDetail: sanitizeErrorText(err instanceof Error ? err.message : String(err), 300),
    });
  }
}
