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
    .select("*") // Removed relation that doesn't exist in schema cache
    .in("status", ["PENDENTE", "PENDING"])
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
      // 1.5. Verificar Score antes de processar
      const { data: pipeline } = await supabaseAdmin
        .from("crm_customer_pipeline")
        .select("conversion_score")
        .eq("phone", followup.phone)
        .maybeSingle();

      const score = pipeline?.conversion_score ?? 50; 
      
      if (score < 30) {
        console.log(`[followup-processor] Skipping followup for ${followup.phone} due to low score (${score})`);
        await supabaseAdmin
          .from("crm_followups")
          .update({ status: 'CLOSED', cancelled_at: new Date().toISOString() })
          .eq("id", followup.id);
        continue;
      }



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
        .update({ status: 'SENDING' })
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
          .update({ status: 'CLOSED' })
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

      const apiKey = process.env['LOVABLE_AI_GATEWAY_KEY'] || "";
      const provider = createLovableAiGatewayProvider(apiKey);
      const { text } = await generateText({
        model: provider("gemini-1.5-flash") as any,
        prompt,
      }).catch(e => {
        console.error("[followup-processor] IA generation failed:", e.message);
        throw new Error(`IA_GENERATION_FAILED: ${e.message}`);
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
          status: newAttempts >= 3 ? 'CLOSED' : 'SENT',
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
        .update({ status: 'FAILED' })
        .eq("id", followup.id);
    }
  }
}
