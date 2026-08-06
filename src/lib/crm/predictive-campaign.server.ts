import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { z } from "zod";
import { getAiProvider, getModelFor } from "@/lib/ai/ai-service.server";
import { logger } from "@/lib/observability/logger.server";
import { AppError } from "@/lib/core/errors";

const CampaignSchema = z.object({
  campaign_name: z.string().min(3),
  target_audience: z.string().min(3),
  service_focus: z.string().min(2),
  suggested_message: z.string().min(10),
  estimated_impact: z.string().optional()
});

export type CampaignGenerationResult = {
  success: boolean;
  generatedCount: number;
  skippedReason?: "NO_PENDING_SLOTS" | "INSUFFICIENT_IDLE_SLOTS";
  errors?: Array<{
    code: string;
    message: string;
    unitId?: string;
    date?: string;
  }>;
};

/**
 * Motor de Campanhas Preditivas (Premium Decision Engine)
 * Identifica ociosidade futura e sugere campanhas personalizadas para aprovação.
 */
export async function runPredictiveCampaignEngine(): Promise<CampaignGenerationResult> {
  logger.info("PREDICTIVE_CAMPAIGN_STARTED", "Starting campaign generation engine");

  try {
    // 1. Identificar ociosidade futura (próximos 3 dias)
    const { data: slots, error: slotsError } = await supabaseAdmin
      .from("crm_slot_opportunities")
      .select("*")
      .eq("status", "pending")
      .limit(50);

    if (slotsError) {
      logger.error("CAMPAIGN_SLOTS_LOAD_FAILED", slotsError.message, { error: slotsError });
      return {
        success: false,
        generatedCount: 0,
        errors: [{ code: "SLOTS_LOAD_FAILED", message: "Erro ao buscar slots disponíveis." }]
      };
    }

    if (!slots || slots.length === 0) {
      return { success: true, generatedCount: 0, skippedReason: 'NO_PENDING_SLOTS' };
    }

    // Agrupar slots por dia/unidade
    const idleSpots = slots.reduce((acc: any, slot: any) => {
      const date = new Date(slot.start_at).toLocaleDateString('pt-BR');
      const key = `${date}_${slot.unidade_id}`;
      if (!acc[key]) acc[key] = { date, unit: slot.unidade_id, count: 0, slots: [] };
      acc[key].count++;
      acc[key].slots.push(slot);
      return acc;
    }, {});

    const minIdleSlots = Number(process.env.CAMPAIGN_MIN_IDLE_SLOTS) || 3;
    const criticalSpots = Object.values(idleSpots).filter((s: any) => s.count >= minIdleSlots);

    if (criticalSpots.length === 0) {
      return { success: true, generatedCount: 0, skippedReason: 'INSUFFICIENT_IDLE_SLOTS' };
    }

    const provider = getAiProvider();
    const model = getModelFor('campaign');
    let generatedCount = 0;
    const errors: any[] = [];

    for (const spot of criticalSpots as any[]) {
      try {
        const prompt = `
          Você é a Julia, Gerente Preditiva de Receita do Seja Livre AI Platform.
          Identificamos baixa ocupação na unidade ${spot.unit} para o dia ${spot.date} (${spot.count} horários vagos).
          Crie uma sugestão de CAMPANHA PREMIUM para preencher esses horários. 
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
          model: provider(model) as any,
          prompt,
        });

        const cleanedText = text.trim().replace(/```json|```/g, '');
        const campaignData = JSON.parse(cleanedText);
        const validatedCampaign = CampaignSchema.parse(campaignData);

        const { data: inserted, error: insertError } = await supabaseAdmin
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
          })
          .select()
          .single();

        if (insertError) {
          throw new AppError({
            code: "CAMPAIGN_SAVE_FAILED",
            message: "Não foi possível salvar a campanha no banco.",
            cause: insertError
          });
        }

        generatedCount++;
      } catch (innerError: any) {
        logger.error("CAMPAIGN_SPOT_PROCESSING_FAILED", innerError.message, { spot, error: innerError });
        errors.push({
          code: innerError.code || "PROCESSING_ERROR",
          message: innerError.message,
          unitId: String(spot.unit),
          date: spot.date
        });
      }
    }

    return {
      success: generatedCount > 0 || errors.length === 0,
      generatedCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    logger.error("CAMPAIGN_ENGINE_CRITICAL_FAILURE", error.message, { error });
    return {
      success: false,
      generatedCount: 0,
      errors: [{ code: "CRITICAL_ENGINE_FAILURE", message: error.message }]
    };
  }
}

