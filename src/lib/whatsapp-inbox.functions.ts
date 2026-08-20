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
  attendance_mode?: "AI" | "HUMAN" | null;
  human_takeover_detected?: boolean;
  human_takeover_source?: string | null;
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

    const conversations = (rows ?? []) as any[];
    const instances = [...new Set(
      conversations
        .map((row) => row.instance)
        .filter((instance): instance is string => typeof instance === "string" && instance.length > 0)
    )];
    const unitByInstance = new Map<string, string>();

    if (instances.length > 0) {
      const { data: agents, error: agentsError } = await supabaseAdmin
        .from("wa_agentes" as never)
        .select("instancia, unidade_id")
        .in("instancia", instances);

      if (agentsError) throw new Error(agentsError.message);
      for (const agent of (agents ?? []) as any[]) {
        if (agent.instancia && agent.unidade_id) {
          unitByInstance.set(String(agent.instancia), String(agent.unidade_id));
        }
      }
    }

    return {
      conversations: conversations.map((row) => ({
        ...row,
        unidade_id: row.unidade_id ?? unitByInstance.get(String(row.instance)) ?? null,
      })),
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
    if (!row) return null;

    const conversation = row as any;
    if (conversation.unidade_id || !conversation.instance) {
      return conversation as WAConversation;
    }

    const { data: agent, error: agentError } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("unidade_id")
      .eq("instancia", conversation.instance)
      .maybeSingle();

    if (agentError) throw new Error(agentError.message);
    return {
      ...conversation,
      unidade_id: (agent as any)?.unidade_id ?? null,
    } as WAConversation;
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

    // MÓDULO HUMANO REMOVIDO: Mantemos o log mas não pausamos a IA.
    const nowIso = new Date().toISOString();
    
    console.log(`[HUMAN_MESSAGE_ECHO] ${JSON.stringify({
      conversationId: data.phone,
      phoneLast4: String(phone_number).slice(-4),
      agentId: null,
      unitId: (conv as any).unidade_id ?? null,
      timestamp: nowIso,
      action: "human_module_removed_ai_remains_active"
    })}`);

    return { success: true };
  });

/** Encerra o atendimento humano e reativa a Julia (ação explícita do atendente). Módulo humano removido. */
export const endHumanTakeover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: z.string() }))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "agendar");
    // Módulo humano removido. Mantendo função para compatibilidade de interface, mas sem efeito de bloqueio.
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


export const getUnitNameMap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { fetchUnitNameMap } = await import("@/lib/units.server");
    return fetchUnitNameMap();
  });
