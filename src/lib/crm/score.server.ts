import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * Calcula o score de conversão (0-100) para todos os clientes ativos no pipeline.
 * Considera: agendamentos, frequência, plano, cancelamentos, NPS (simulado se não houver), follow-ups.
 */
export async function updateCustomerScores() {
  console.log("[score-ia] Iniciando atualização de scores...");

  // 1. Buscar todos os clientes no pipeline
  const { data: customers, error } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("phone, customer_name, current_stage, conversion_score, customer_context:wa_conversas(customer_context)");

  if (error) {
    console.error("[score-ia] Erro ao buscar clientes:", error.message);
    return;
  }

  const provider = createLovableAiGatewayProvider(process.env.LOVABLE_AI_GATEWAY_KEY || "");

  for (const customer of customers) {
    try {
      // 2. IA decide o score baseado no contexto acumulado
      const context = (customer.customer_context as any)?.customer_context || {};
      
      const prompt = `
        Você é um Analista de CRM Inteligente. Seu objetivo é atribuir um SCORE de 0 a 100 para a probabilidade de conversão deste cliente.
        
        DADOS DO CLIENTE:
        - Nome: ${customer.customer_name || 'Desconhecido'}
        - Estágio Atual: ${customer.current_stage}
        - Histórico (Contexto): ${JSON.stringify(context)}
        
        CRITÉRIOS DE PONTUAÇÃO (0-100):
        - Frequência e últimos atendimentos (Histórico BEMP/Conversa)
        - Tem plano de assinatura ativo? (Geralmente fideliza)
        - Profissional favorita identificada?
        - Resposta positiva a follow-ups anteriores?
        - Cancelamentos frequentes? (Retira pontos)
        - NPS/Satisfação expressa em conversa.
        - Gastos/Volume de serviços.
        
        RESPONDA APENAS UM NÚMERO INTEIRO ENTRE 0 E 100.
      `;

      const { text } = await generateText({
        model: provider("gemini-1.5-flash") as any,
        prompt,
      });

      const score = parseInt(text.trim().replace(/[^0-9]/g, ''), 10);
      
      if (!isNaN(score)) {
        await supabaseAdmin
          .from("crm_customer_pipeline")
          .update({ conversion_score: score })
          .eq("phone", customer.phone);
        
        console.log(`[score-ia] Score atualizado para ${customer.phone}: ${score}`);
      }
    } catch (err) {
      console.error(`[score-ia] Falha ao processar score para ${customer.phone}:`, err);
    }
  }
}

/**
 * Decide se um cliente deve receber follow-up baseado no score.
 * Retorna true se o score for alto o suficiente ou se houver potencial de recuperação.
 */
export async function shouldSendFollowup(phone: string, currentScore: number): Promise<boolean> {
  // Regra básica: Clientes com score > 30 merecem follow-up. 
  // Clientes com score < 30 podem ser considerados "frios" ou sem interesse real.
  return currentScore >= 30;
}
