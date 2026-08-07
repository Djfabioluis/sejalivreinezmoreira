import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "./observability/logger.server";

export interface FindOrCreateConversationParams {
  instance: string;
  phone_number: string; // E.164 format
  contact_name?: string;
  unidade_id?: string;
  agent_id?: string;
  metadata?: Record<string, any>;
}

export class ConversationService {
  /**
   * Find or create a conversation record in wa_conversas.
   * This is the single source of truth for creating conversations to avoid schema mismatches.
   */
  static async findOrCreate(params: FindOrCreateConversationParams) {
    const { instance, phone_number, contact_name, unidade_id, agent_id, metadata } = params;
    const conversationKey = `${instance}:${phone_number}`;
    const traceId = metadata?.traceId || `conv-${Math.random().toString(36).substring(7)}`;

    try {
      // 1. Try to find existing
      const { data: existing, error: findError } = await supabaseAdmin
        .from("wa_conversas" as never)
        .select("*")
        .eq("phone", conversationKey)
        .maybeSingle();

      if (findError) throw findError;
      if (existing) return existing;

      // 2. Create new if not found
      // Only include columns verified to exist in the database
      const payload: any = {
        phone: conversationKey,
        phone_number: phone_number,
        instance: instance,
        contact_name: contact_name || "Cliente",
        status: "aberta",
        messages: '[]' as any, // Postgres expects jsonb as string or object depending on adapter
        unread_count: 0
      };

      // Add optional fields if they exist
      if (unidade_id) payload.unidade_id = unidade_id;
      if (agent_id) payload.agent_id = agent_id;
      
      // Note: We are NOT sending metadata, updated_at, or created_at 
      // because they are either missing or handled by DB defaults.
      // If customer_context is needed, we initialize it empty
      payload.customer_context = {};

      logger.info("CONVERSATION_CREATE_ATTEMPT", "Iniciando criação de conversa", { 
        traceId, 
        payload,
        phone_number 
      });

      const { data: created, error: createError } = await supabaseAdmin
        .from("wa_conversas" as never)
        .insert(payload)
        .select("*")
        .single();

      if (createError) {
        logger.error("CONVERSATION_CREATE_FAILED", createError.message, {
          traceId,
          code: createError.code,
          hint: (createError as any).hint,
          details: (createError as any).details,
          payload
        });
        throw createError;
      }

      logger.info("CONVERSATION_CREATED", "Conversa criada com sucesso", { 
        traceId, 
        phone: conversationKey 
      });

      return created;
    } catch (err: any) {
      logger.error("CONVERSATION_SERVICE_ERROR", err.message, { traceId, params });
      throw err;
    }
  }

  static async findByPhone(instance: string, phoneNumber: string) {
    const conversationKey = `${instance}:${phoneNumber}`;
    const { data } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("*")
      .eq("phone", conversationKey)
      .maybeSingle();
    return data;
  }
}
