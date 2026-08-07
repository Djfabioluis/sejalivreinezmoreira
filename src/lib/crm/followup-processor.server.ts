import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, getAiKey } from "@/lib/ai-gateway.server";
import { logger } from "../observability/logger.server";

interface FollowupRule {
  id: string;
  name: string;
  type: string;
  delay_amount: number;
  delay_unit: 'MINUTES' | 'HOURS' | 'DAYS';
  message_mode: 'AI' | 'FIXED';
  fixed_message?: string;
  start_time: string;
  end_time: string;
  max_attempts: number;
}

export async function processPendingFollowups() {
  const traceId = `fup-proc-${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  const nowIso = now.toISOString();

  logger.info("FOLLOWUP_WORKER_STARTED", "Iniciando processamento de follow-ups", { traceId, now: nowIso });

  try {
    await discoverNewFollowups(traceId);

    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("crm_followups")
      .update({ 
        status: "READY", 
        updated_at: nowIso,
        metadata: { recovery: "stuck_processing_reset", reset_at: nowIso }
      } as any)
      .in("status", ["PROCESSING", "EM_PROCESSAMENTO"])
      .lt("updated_at", fifteenMinsAgo);

    const { data: followups, error: fetchError } = await (supabaseAdmin
      .from("crm_followups" as any) as any)
      .select("*")
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"])
      .lte("scheduled_at", nowIso)
      .lt("attempts", 3)
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (fetchError || !followups) return;

    for (const followup of (followups as any[])) {
      await processSingleFollowup(followup, traceId);
    }
  } catch (err: any) {
    logger.critical("FOLLOWUP_WORKER_CRASH", err.message, { traceId, error: err });
  }
}

async function processSingleFollowup(followup: any, parentTraceId: string) {
  const traceId = `${parentTraceId}-${followup.id.split('-')[0]}`;
  
  try {
    const { error: lockError } = await supabaseAdmin
      .from("crm_followups")
      .update({ status: "PROCESSING", updated_at: new Date().toISOString() } as any)
      .eq("id", followup.id)
      .in("status", ["PENDING", "READY", "PENDENTE", "READY_TO_SEND"]);

    if (lockError) return;

    const { data: conversation } = await (supabaseAdmin
      .from("wa_conversas" as any) as any)
      .select("*")
      .eq("phone", followup.phone)
      .maybeSingle();

    if (!conversation) {
      await blockFollowup(followup.id, "INVALID_PHONE", "Conversa não encontrada", traceId);
      return;
    }

    const ctx = (conversation.customer_context as any) || {};
    const attendanceMode = ctx.attendance_mode || (conversation as any).attendance_mode;
    
    if (attendanceMode === "human" || conversation.status === "atendido_humano") {
      await blockFollowup(followup.id, "HUMAN_ATTENDING", "Cliente em atendimento humano", traceId);
      return;
    }

    let messageText = followup.message_template;
    if (!messageText) {
       messageText = await generateAiFollowup(followup, conversation, traceId);
    }

    if (!messageText) throw new Error("IA_GENERATION_FAILED");

    const { sendEvolutionText } = await import("@/lib/evolution.server");
    const success = await sendEvolutionText(conversation.instance, conversation.phone_number, messageText);

    if (!success) throw new Error("EVOLUTION_SEND_FAILED");

    const now = new Date().toISOString();
    await (supabaseAdmin.rpc("append_wa_message" as any, {
      p_phone: followup.phone,
      p_message: { id: `fup-${Date.now()}`, role: 'assistant', parts: [{ type: 'text', text: messageText }], createdAt: now },
      p_instance: conversation.instance,
      p_phone_number: conversation.phone_number,
      p_increment_unread: false,
      p_new_status: "aguardando"
    } as any) as any);

    await supabaseAdmin
      .from("crm_followups")
      .update({
        status: "SENT",
        attempts: (followup.attempts || 0) + 1,
        sent_at: now,
        completed_at: now,
        message_template: messageText,
        updated_at: now
      } as any)
      .eq("id", followup.id);

  } catch (err: any) {
    await supabaseAdmin
      .from("crm_followups")
      .update({
        status: (followup.attempts || 0) < 2 ? "READY" : "FAILED",
        attempts: (followup.attempts || 0) + 1,
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", followup.id);
  }
}

async function blockFollowup(id: string, reasonCode: string, message: string, traceId: string) {
  logger.info("FOLLOWUP_BLOCKED", message, { traceId, followupId: id, reasonCode });
  await supabaseAdmin
    .from("crm_followups")
    .update({
      status: "CANCELED",
      cancelled_at: new Date().toISOString(),
      metadata: { blocker: reasonCode, blocker_message: message },
      updated_at: new Date().toISOString()
    } as any)
    .eq("id", id);
}

async function generateAiFollowup(followup: any, conversation: any, traceId: string): Promise<string> {
  const prompt = `Julia, Salão Seja Livre. Follow-up: ${followup.stage}. Nome: ${conversation.contact_name || 'Cliente'}`;
  try {
    const apiKey = await getAiKey();
    const provider = createLovableAiGatewayProvider(apiKey || "");
    const { text } = await generateText({
      model: provider("gemini-1.5-flash") as any,
      prompt,
    });
    return text;
  } catch (e) {
    return "";
  }
}

async function discoverNewFollowups(traceId: string) {
  const { data: rules } = await (supabaseAdmin.from("crm_followup_rules" as any) as any).select("*").eq("enabled", true);
  if (!rules) return;

  for (const rule of (rules as FollowupRule[])) {
    if (rule.type === 'ABANDONMENT') {
       await handleAbandonmentRule(rule, traceId);
    }
  }
}

async function handleAbandonmentRule(rule: FollowupRule, traceId: string) {
  const now = new Date();
  let delayMs = rule.delay_amount * 60 * 1000;
  if (rule.delay_unit === 'HOURS') delayMs *= 60;
  if (rule.delay_unit === 'DAYS') delayMs *= 24;

  const threshold = new Date(now.getTime() - delayMs).toISOString();

  const { data: abandoned } = await (supabaseAdmin
    .from("wa_conversas" as any) as any)
    .select("phone, customer_context, last_interaction_at")
    .not("status", "in", '("atendido_humano", "finalizado")')
    .lt("last_interaction_at", threshold);

  if (!abandoned) return;

  for (const conv of (abandoned as any[])) {
    const { data: existing } = await supabaseAdmin.from("crm_followups").select("id").eq("phone", conv.phone).eq("rule_id" as any, rule.id).maybeSingle();
    if (existing) continue;

    await (supabaseAdmin.from("crm_followups" as any) as any).insert({
      phone: conv.phone,
      stage: (conv.customer_context as any)?.current_stage || 'ABANDONADO',
      reason: 'ABANDONMENT_RULE',
      scheduled_at: now.toISOString(),
      status: 'PENDING',
      rule_id: rule.id,
      message_template: rule.message_mode === 'FIXED' ? rule.fixed_message : null,
      metadata: { traceId, rule_name: rule.name }
    } as any);
  }
}
