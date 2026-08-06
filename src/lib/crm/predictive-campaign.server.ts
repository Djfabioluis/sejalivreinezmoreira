import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * Motor de Campanhas Preditivas (Premium Decision Engine)
 * Identifica ociosidade futura e sugere campanhas personalizadas para aprovação.
 */
export async function runPredictiveCampaignEngine() {
  console.log("[predictive-campaign] Iniciando motor de decisões premium...");

  try {
    // 1. Identificar ociosidade futura (próximos 3 dias)
    const { data: slots } = await supabaseAdmin
      .from("crm_slot_opportunities")
      .select("*")
      .eq("status", "pending")
      .limit(50);

    if (!slots || slots.length === 0) return;

    // Agrupar slots por dia/unidade para identificar "buracos" na agenda
    const idleSpots = slots.reduce((acc: any, slot: any) => {
      const date = new Date(slot.start_at).toLocaleDateString('pt-BR');
      const key = `${date}_${slot.unidade_id}`;
      if (!acc[key]) acc[key] = { date, unit: slot.unidade_id, count: 0, slots: [] };
      acc[key].count++;
      acc[key].slots.push(slot);
      return acc;
    }, {});

    // Filtrar períodos com alta ociosidade (ex: mais de 3 slots vagos no mesmo dia/unidade)
    const criticalSpots = Object.values(idleSpots).filter((s: any) => s.count >= 3);

    if (criticalSpots.length === 0) return;

    const provider = createLovableAiGatewayProvider(process.env.LOVABLE_AI_GATEWAY_KEY || "");

    for (const spot of criticalSpots as any[]) {
      // 2. IA gera uma sugestão de campanha baseada na ociosidade
      const prompt = `
        Você é a Julia, Gerente Preditiva de Receita.
        
        CENÁRIO:
        Identificamos baixa ocupação na unidade ${spot.unit} para o dia ${spot.date}. 
        Temos ${spot.count} horários vagos.
        
        TAREFA:
        Crie uma sugestão de CAMPANHA PREMIUM para preencher esses horários. 
        A campanha deve ser específica (ex: Escova Premium, Hidratação, Combo Relax) e direcionada.
        
        REGRAS:
        - Defina o público-alvo (ex: "clientes que não visitam há 30 dias e preferem o serviço X").
        - Crie um nome para a campanha.
        - Escreva a mensagem sugerida.
        
        RESPONDA APENAS JSON:
        {
          "campaign_name": "Nome da Campanha",
          "target_audience": "Descrição do público",
          "service_focus": "Serviço alvo",
          "suggested_message": "Texto da mensagem",
          "estimated_impact": "Ex: R$ 1.200 em receita"
        }
      `;

      const { text } = await generateText({
        model: provider("gemini-1.5-flash") as any,
        prompt,
      });

      const campaign = JSON.parse(text.trim().replace(/```json|```/g, ''));

      // 3. Salvar como recomendação pendente para aprovação (Produto Premium)
      await (supabaseAdmin
        .from("crm_recommendations" as any) as any)
        .insert({
          recommendation_type: 'PREDICTIVE_CAMPAIGN',
          reason: `Baixa ocupação detectada em ${spot.date}`,
          suggested_message: campaign.suggested_message,
          confidence: 88,
          status: 'PENDING',
          metadata: {
            ...campaign,
            spot_date: spot.date,
            unit_id: spot.unit,
            is_premium_decision: true
          }
        });

      console.log(`[predictive-campaign] Sugestão premium gerada: ${campaign.campaign_name}`);
    }

  } catch (error) {
    console.error("[predictive-campaign] Erro ao gerar decisões preditivas:", error);
  }
}
