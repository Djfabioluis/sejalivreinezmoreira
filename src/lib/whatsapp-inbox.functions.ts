import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { sendEvolutionText } from "@/lib/evolution.server";

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
  .inputValidator((input: { instance?: string; status?: string; unreadOnly?: boolean; search?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("wa_conversas" as never)
      .select("*")
      .order("updated_at", { ascending: false });

    if (data.instance) query = query.eq("instance", data.instance);
    if (data.status && data.status !== "todos") query = query.eq("status", data.status);
    if (data.unreadOnly) query = query.gt("unread_count", 0);
    if (data.search) {
      query = query.or(`phone_number.ilike.%${data.search}%,contact_name.ilike.%${data.search}%`);
    }

    const { data: rows, error } = await query.limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as WAConversation[];
  });

export const markAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ phone: z.string() }))
  .handler(async ({ data }) => {
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
  .handler(async ({ data }) => {
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
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("instance, phone_number")
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
      parts: [{ type: "text", text: data.text }]
    };

    const { error: rpcErr } = await supabaseAdmin.rpc("append_wa_message", {
      p_phone: data.phone,
      p_message: message,
      p_instance: instance,
      p_phone_number: phone_number,
      p_increment_unread: false
    });

    if (rpcErr) throw new Error(`Mensagem enviada, mas falha ao salvar no histórico: ${rpcErr.message}`);

    return { success: true };
  });
