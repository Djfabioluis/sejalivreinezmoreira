import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export type OpportunityType =
  | 'ABANDONED_BOOKING'
  | 'RETURN_REMINDER'
  | 'BIRTHDAY'
  | 'PLAN_AVAILABLE'
  | 'EMPTY_SLOT'
  | 'VIP_CUSTOMER'
  | 'REBOOK'
  | 'WAITING_LIST'
  | 'UPSELL'
  | 'CROSS_SELL';

export type OpportunityStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXECUTADO' | 'FALHA';

/**
 * Motor de Oportunidades: Identifica novas oportunidades comerciais.
 */
export async function runOpportunityEngine() {
  console.log("[opportunity-engine] Running...");

  // 1. Buscar clientes do pipeline para análise
  const { data: pipeline } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("*, customer_context:wa_conversas(customer_context)");

  if (!pipeline) return;

  const provider = createLovableAiGatewayProvider(process.env.LOVABLE_AI_GATEWAY_KEY || "");

  for (const customer of pipeline) {
    try {
      const context = (customer.customer_context as any)?.customer_context || {};
      
      // IA analisa o contexto para identificar oportunidades
      const prompt = `
        Você é o Opportunity Engine da Julia Virtual. Analise os dados do cliente e identifique UMA oportunidade comercial prioritária.
        
        DADOS:
        - Nome: ${customer.customer_name || customer.phone}
        - Estágio CRM: ${customer.current_stage}
        - Score: ${customer.conversion_score}
        - Contexto: ${JSON.stringify(context)}
        
        OPÇÕES DE TIPOS:
        ABANDONED_BOOKING, RETURN_REMINDER, BIRTHDAY, PLAN_AVAILABLE, EMPTY_SLOT, VIP_CUSTOMER, REBOOK, WAITING_LIST, UPSELL, CROSS_SELL.
        
        REGRAS:
        - Prioridade de 0 a 100.
        - Recomendação de ação humanizada.
        
        RESPONDA APENAS JSON:
        {
          "type": "TIPO",
          "score": 0-100,
          "trigger": "motivo resumido",
          "recommended_action": "texto sugerido para a IA enviar"
        }
        Se não houver oportunidade clara, responda null.
      `;

      const { text } = await generateText({
        model: provider("gemini-1.5-flash") as any,
        prompt,
      });

      const cleanText = text.trim();
      if (cleanText === 'null') continue;

      const opportunity = JSON.parse(cleanText.replace(/```json|```/g, ''));
      
      if (opportunity && opportunity.type) {
        // Usando asArray para contornar problemas de tipos no Supabase Client auto-gerado se a tabela for nova
        const { data: existing } = await (supabaseAdmin
          .from("crm_opportunities" as any) as any)
          .select("id")
          .eq("customer_id", customer.phone)
          .eq("opportunity_type", opportunity.type)
          .eq("status", "PENDENTE")
          .maybeSingle();

        if (!existing) {
          await (supabaseAdmin
            .from("crm_opportunities" as any) as any)
            .insert({
              customer_id: customer.phone,
              conversation_id: customer.conversation_id,
              opportunity_type: opportunity.type,
              score: opportunity.score,
              priority: opportunity.score,
              trigger: opportunity.trigger,
              recommended_action: opportunity.recommended_action,
              status: 'PENDENTE'
            });
          
          console.log(`[opportunity-engine] New ${opportunity.type} for ${customer.phone}`);
        }
      }
    } catch (err) {
      console.error(`[opportunity-engine] Error analyzing ${customer.phone}:`, err);
    }
  }
}
