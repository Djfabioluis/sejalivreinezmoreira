import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { z } from "zod";

const CampaignSchema = z.object({
  campaign_name: z.string().min(3),
  target_audience: z.string().min(3),
  service_focus: z.string().min(2),
  suggested_message: z.string().min(10),
  estimated_impact: z.string().optional()
});

export interface CampaignEngineResult {
  success: boolean;
  generatedCount: number;
  skippedReason?: 'NO_PENDING_SLOTS' | 'INSUFFICIENT_IDLE_SLOTS';
  errors?: Array<{
    unitId?: string;
    date?: string;
    message: string;
  }>;
}

/**
 * Motor de Campanhas Preditivas (Premium Decision Engine)
 * Identifica ociosidade futura e sugere campanhas personalizadas para aprovação.
 */
export async function runPredictiveCampaignEngine(): Promise<CampaignEngineResult> {
  console.log("[predictive-campaign] campaign_generation_started");

  try {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY não configurada para geração de campanhas");
    }

    // 1. Identificar ociosidade futura (próximos 3 dias)
    const { data: slots, error: slotsError } = await supabaseAdmin
      .from("crm_slot_opportunities")
      .select("*")
      .eq("status", "pending")
      .limit(50);

    if (slotsError) {
      throw new Error(`Erro ao buscar slots: ${slotsError.message}`);
    }

    console.log(`[predictive-campaign] campaign_slots_loaded: ${slots?.length || 0}`);

    if (!slots || slots.length === 0) {
      return { success: true, generatedCount: 0, skippedReason: 'NO_PENDING_SLOTS' };
    }

    // Agrupar slots por dia/unidade para identificar "buracos" na agenda
    const idleSpots = slots.reduce((acc: any, slot: any) => {
      const date = new Date(slot.start_at).toLocaleDateString('pt-BR');
      const key = `${date}_${slot.unidade_id}`;
      if (!acc[key]) acc[key] = { date, unit: slot.unidade_id, count: 0, slots: [] };
      acc[key].count++;
      acc[key].slots.push(slot);
      return acc;
    }, {});

    // Filtrar períodos com alta ociosidade (mínimo 3 slots)
    const minIdleSlots = Number(process.env.CAMPAIGN_MIN_IDLE_SLOTS) || 3;
    const criticalSpots = Object.values(idleSpots).filter((s: any) => s.count >= minIdleSlots);

    if (criticalSpots.length === 0) {
      console.log("[predictive-campaign] campaign_insufficient_slots");
      return { success: true, generatedCount: 0, skippedReason: 'INSUFFICIENT_IDLE_SLOTS' };
    }

    const provider = createLovableAiGatewayProvider(apiKey);
    let generatedCount = 0;
    const errors: any[] = [];

    for (const spot of criticalSpots as any[]) {
      try {
        console.log(`[predictive-campaign] campaign_ai_started for unit ${spot.unit}`);
        
        const prompt = `
          Você é a Julia, Gerente Preditiva de Receita do Seja Livre AI Platform.
          
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
          model: provider("google/gemini-1.5-flash") as any,
          prompt,
        });

        const cleanedText = text.trim().replace(/```json|```/g, '');
        let campaignData;
        try {
          campaignData = JSON.parse(cleanedText);
        } catch (e) {
          console.error("[predictive-campaign] campaign_ai_invalid_response", cleanedText);
          throw new Error("IA retornou JSON inválido");
        }

        const validatedCampaign = CampaignSchema.parse(campaignData);
        console.log(`[predictive-campaign] campaign_ai_completed: ${validatedCampaign.campaign_name}`);

        // 3. Salvar como recomendação pendente (unit_id agora suportado e customer_id opcional)
        console.log("[predictive-campaign] campaign_save_started");
        const { error: insertError } = await supabaseAdmin
          .from("crm_recommendations")
          .insert({
            recommendation_type: 'PREDICTIVE_CAMPAIGN',
            reason: `Baixa ocupação detectada em ${spot.date}`,
            suggested_message: validatedCampaign.suggested_message,
            confidence: 88,
            status: 'PENDING',
            unit_id: String(spot.unit),
            campaign_name: validatedCampaign.campaign_name,
            target_audience: validatedCampaign.target_audience,
            service_focus: validatedCampaign.service_focus,
            metadata: {
              ...validatedCampaign,
              spot_date: spot.date,
              unit_id: spot.unit,
              is_premium_decision: true
            }
          });

        if (insertError) {
          console.error("[predictive-campaign] campaign_save_failed", insertError);
          throw new Error(`Falha ao salvar no banco: ${insertError.message}`);
        }

        generatedCount++;
        console.log("[predictive-campaign] campaign_save_completed");

      } catch (innerError: any) {
        errors.push({
          unitId: String(spot.unit),
          date: spot.date,
          message: innerError.message
        });
      }
    }

    console.log(`[predictive-campaign] campaign_generation_completed. Generated: ${generatedCount}, Errors: ${errors.length}`);
    
    return {
      success: errors.length < (criticalSpots as any[]).length,
      generatedCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    console.error("[predictive-campaign] generation_failed", error);
    throw error;
  }
}
