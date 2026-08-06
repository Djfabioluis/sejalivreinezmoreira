import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * Processa follow-ups agendados.
 * Chamado pelo cron job.
 */
export async function processPendingFollowups() {
  const now = new Date().toISOString();
  
  // 1. Buscar follow-ups pendentes e agendados para agora ou passado
  const { data: pending, error } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("status", "PENDENTE")
    .lte("scheduled_at", now)
    .lt("attempts", 3);

  if (error) {
    console.error("[followup-processor] Error fetching followups:", error.message);
    return;
  }

  if (!pending || pending.length === 0) return;

  console.log(`[followup-processor] Processing ${pending.length} followups...`);

  for (const followup of pending) {
    try {
      if (followup.reason === 'PRICE') {
        await supabaseAdmin
          .from("crm_followups")
          .update({ status: 'ENCERRADO', cancelled_at: new Date().toISOString() })
          .eq("id", followup.id);
        continue;
      }

      // Marcar como em processamento
      await supabaseAdmin
        .from("crm_followups")
        .update({ status: 'EM_PROCESSAMENTO' })
        .eq("id", followup.id);

      // 2. Obter contexto da última conversa para a IA
      const { data: conversation } = await supabaseAdmin
        .from("wa_conversas")
        .select("*")
        .eq("phone", followup.phone)
        .maybeSingle();

      if (!conversation) {
        await supabaseAdmin
          .from("crm_followups")
          .update({ status: 'CANCELADO' })
          .eq("id", followup.id);
        continue;
      }

      // 3. IA gera a mensagem humanizada baseada no contexto
      const prompt = `
        Você é a Julia, secretária do Salão Seja Livre.
        Precisa enviar um follow-up humanizado para um cliente que parou o atendimento no estágio: ${followup.stage}.
        
        CONTEXTO DO CLIENTE:
        - Nome: ${conversation.contact_name || 'Cliente'}
        - Último estado: ${followup.reason || 'Interesse em agendamento'}
        - Histórico recente: ${JSON.stringify((conversation.customer_context || {}))}
        
        REGRAS:
        - Se o motivo do abandono foi PREÇO, NÃO insista e encerre o follow-up.
        - NUNCA use mensagens genéricas.
        - Refira-se ao interesse anterior (ex: "Vi que estávamos conversando sobre seu corte de cabelo...").
        - Seja gentil, acolhedora e NUNCA pressione.
        - Se for o 3º follow-up, seja mais conclusiva mas educada.
        - Máximo 2 parágrafos curtos.
        - Use emojis moderadamente.
      `;

      const provider = createLovableAiGatewayProvider(process.env.LOVABLE_AI_GATEWAY_KEY || "");
      const { text } = await generateText({
        model: provider("gemini-1.5-flash") as any,
        prompt,
      });

      // 4. Enviar via Evolution API
      const { data: instanceData } = await supabaseAdmin
        .from("wa_conversas")
        .select("instance, phone_number")
        .eq("phone", followup.phone)
        .single();
      
      const conv = instanceData as any;
      if (conv?.instance && conv?.phone_number) {
        const { sendEvolutionText } = await import("@/lib/evolution.server");

        await sendEvolutionText(conv.instance, conv.phone_number, text);
        
        // Registrar na conversa
        const { appendIncomingMessage } = await import("@/lib/evolution/conversation.server");
        // We use a simplified helper or raw RPC to avoid circular deps if needed, 
        // but append_wa_message RPC is the source of truth.
        await supabaseAdmin.rpc("append_wa_message" as any, {
            p_phone: followup.phone,
            p_message: {
                id: `fup-${Date.now()}`,
                role: 'assistant',
                parts: [{ type: 'text', text }],
                createdAt: new Date().toISOString()
            },
            p_instance: conv.instance,
            p_phone_number: conv.phone_number,
            p_increment_unread: false,
            p_new_status: "aguardando"
        });
      }

      // 5. Atualizar status
      const newAttempts = (followup.attempts || 0) + 1;
      await supabaseAdmin
        .from("crm_followups")
        .update({
          status: newAttempts >= 3 ? 'ENCERRADO' : 'ENVIADO',
          attempts: newAttempts,
          sent_at: new Date().toISOString(),
          message_template: text
        })
        .eq("id", followup.id);

      console.log(`[followup-processor] Followup sent to ${followup.phone}`);

    } catch (err: any) {
      console.error(`[followup-processor] Failed to process followup ${followup.id}:`, err.message);
      await supabaseAdmin
        .from("crm_followups")
        .update({ status: 'FALHA' })
        .eq("id", followup.id);
    }
  }
}
