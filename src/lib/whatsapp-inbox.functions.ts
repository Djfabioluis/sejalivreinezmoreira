import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { sendEvolutionText } from "@/lib/evolution.server";
import { assertPermission } from "@/lib/permissions.functions";
import { safeIlikePattern } from "@/lib/postgrest-safe";

export type WAConversation = {
  phone: string;
  instance: string | null;
  phone_number: string | null;
  contact_name: string | null;
  unread_count: number;
  last_read_at: string | null;
  status: string;
  messages: any[];
  updated_at: string;
  unidade_id?: string | null;
};


export function extractConversationMessageText(message: any): string {
  if (!message) return "";
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join(" ");
  }
  if (message.content) return String(message.content);
  if (message.text) return String(message.text);
  return "";
}

export const listWAConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ 
    instance: z.string().optional(), 
    status: z.string().optional(), 
    unreadOnly: z.boolean().optional(), 
    search: z.string().trim().max(120).optional(),
    page: z.number().default(0),
    pageSize: z.number().default(20)
  }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "painel");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("wa_conversas" as never)
      .select("phone, instance, phone_number, contact_name, unread_count, status, updated_at, unidade_id", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (data.instance) query = query.eq("instance", data.instance);
    if (data.status && data.status !== "todos") query = query.eq("status", data.status);
    if (data.unreadOnly) query = query.gt("unread_count", 0);
    if (data.search) {
      const term = safeIlikePattern(data.search);
      query = query.or(`phone_number.ilike.${term},contact_name.ilike.${term}`);
    }

    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    
    const { data: rows, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);
    return {
      conversations: (rows ?? []) as any[],
      total: count ?? 0
    };
  });

export const getWAConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: z.string() }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "painel");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("*")
      .eq("phone", data.phone)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    return row as any as WAConversation | null;
  });

export const markAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: z.string() }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "painel");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("wa_conversas" as never)
      .update({ unread_count: 0, last_read_at: new Date().toISOString() } as never)
      .eq("phone", data.phone);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: z.string(), status: z.string() }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "painel");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("wa_conversas" as never)
      .update({ status: data.status } as never)
      .eq("phone", data.phone);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const sendManualWAMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ 
    phone: z.string(), 
    text: z.string().min(1).max(3500) 
  }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "agendar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("instance, phone_number, unidade_id")
      .eq("phone", data.phone)
      .maybeSingle();
    
    if (convErr || !conv) throw new Error("Conversa não encontrada ou inválida.");
    const { instance, phone_number } = conv as any;
    if (!instance || !phone_number) throw new Error("Instância ou número inválido para esta conversa.");

    const sent = await sendEvolutionText(instance, phone_number, data.text);
    if (!sent) throw new Error("Falha ao enviar mensagem pela Evolution API.");

    const message = {
      id: `m-${Date.now()}`,
      role: "operator",
      parts: [{ type: "text", text: data.text }],
      createdAt: new Date().toISOString()
    };

    const { error: rpcErr } = await supabaseAdmin.rpc("append_wa_message", {
      p_phone: data.phone,
      p_new_message: message,
    });

    if (rpcErr) throw new Error(`Mensagem enviada, mas falha ao salvar no histórico: ${rpcErr.message}`);

    // Atendente humano respondeu: manter conversa em modo HUMANO e IA pausada
    const nowIso = new Date().toISOString();
    await supabaseAdmin
      .from("wa_conversas" as never)
      .update({
        attendance_mode: "HUMAN",
        human_takeover_detected: true,
        human_takeover_at: nowIso,
        ai_paused_at: nowIso,
        ai_pause_reason: "HUMAN_AGENT_REPLIED",
        last_human_message_at: nowIso,
      } as never)
      .eq("phone", data.phone);

    console.log(`[HUMAN_MESSAGE_DETECTED] ${JSON.stringify({
      conversationId: data.phone,
      phoneLast4: String(phone_number).slice(-4),
      agentId: null,
      unitId: (conv as any).unidade_id ?? null,
      timestamp: nowIso,
    })}`);

    return { success: true };
  });

/** Encerra o atendimento humano e reativa a Julia (ação explícita do atendente). */
export const endHumanTakeover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: z.string() }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "agendar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("wa_conversas" as never)
      .update({
        attendance_mode: "AI",
        human_takeover_detected: false,
        human_takeover_at: null,
        human_takeover_requested_at: null,
        human_transfer_message_sent: false,
        ai_paused_at: null,
        ai_pause_reason: null,
      } as never)
      .eq("phone", data.phone);

    if (error) throw new Error(error.message);

    console.log(`[CONVERSATION_MODE_CHANGED_TO_AI] ${JSON.stringify({
      conversationId: data.phone,
      phoneLast4: data.phone.slice(-4),
      agentId: null,
      unitId: null,
      timestamp: new Date().toISOString(),
    })}`);

    return { success: true };
  });

export const transferConversationUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    phone: z.string(),
    targetUnitId: z.string(),
    reason: z.string().optional()
  }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "agendar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).userId;

    const { data: result, error } = await supabaseAdmin.rpc("transfer_conversation_unit", {
      p_conversation_phone: data.phone,
      p_target_unit_id: data.targetUnitId,
      p_user_id: userId,
      p_reason: data.reason || "Transferência manual via painel"
    });

    if (error) throw new Error(error.message);
    
    // Inserir evento de sistema no histórico
    const { data: conv } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("previous_unit_id, unidade_id")
      .eq("phone", data.phone)
      .single();

    if (conv) {
      const c = conv as any;
      const message = {
        id: `sys-${Date.now()}`,
        role: "system",
        parts: [{ 
          type: "text", 
          text: `🔄 Atendimento transferido para a unidade ${data.targetUnitId}.` 
        }]
      };
      
      await supabaseAdmin.rpc("append_wa_message", {
        p_phone: data.phone,
        p_new_message: message,
      });
    }

    return result;
  });

