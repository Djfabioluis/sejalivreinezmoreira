import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * IA Comercial: Analisa atendimentos concluídos para sugerir cross-sell e upsell.
 */
export async function analyzeCommercialOpportunities(customerId: string, appointmentDetails: any) {
  console.log(`[commercial-ia] Analyzing opportunities for ${customerId}...`);

  try {
    const provider = createLovableAiGatewayProvider(process.env.LOVABLE_AI_GATEWAY_KEY || "");
    
    // Buscar histórico recente para contexto
    const { data: pipeline } = await supabaseAdmin
      .from("crm_customer_pipeline")
      .select("conversion_score, customer_name")
      .eq("phone", customerId)
      .maybeSingle();

    const prompt = `
      Você é a IA Comercial da Julia Virtual, secretária de um salão de beleza.
      Sua missão é gerar recomendações de vendas (Upsell/Cross-sell) RELEVANTES e NÃO INSISTENTES.

      DADOS DO ATENDIMENTO CONCLUÍDO:
      - Cliente: ${pipeline?.customer_name || customerId}
      - Serviço realizado: ${appointmentDetails.service_name}

      EXEMPLOS DE LÓGICA:
      - Fez manicure? Sugerir pedicure.
      - Fez hidratação? Sugerir escova.
      - Faz escova toda semana? Sugerir Plano Beauty.

      REGRAS:
      - Gere somente sugestões que façam sentido.
      - Não ser insistente.
      - Se não houver nada relevante, retorne null.

      RESPONDA APENAS JSON:
      {
        "type": "CROSS_SELL" | "UPSELL",
        "reason": "Por que você está sugerindo isso?",
        "confidence": 0-100,
        "suggested_message": "Oi! Notei que você fez [serviço] hoje. Que tal [sugestão] na próxima? 😊"
      }
    `;

    const { text } = await generateText({
      model: provider("gemini-1.5-flash") as any,
      prompt,
    });

    const cleanText = text.trim();
    if (cleanText === 'null' || !cleanText.startsWith('{')) return;

    const recommendation = JSON.parse(cleanText.replace(/```json|```/g, ''));

    if (recommendation && recommendation.type) {
      await (supabaseAdmin
        .from("crm_recommendations" as any) as any)
        .insert({
          customer_id: customerId,
          recommendation_type: recommendation.type,
          reason: recommendation.reason,
          confidence: recommendation.confidence,
          suggested_message: recommendation.suggested_message,
          metadata: { original_appointment: appointmentDetails },
          status: 'PENDENTE'
        });
      
      console.log(`[commercial-ia] New recommendation for ${customerId}: ${recommendation.type}`);
    }
  } catch (err) {
    console.error(`[commercial-ia] Error analyzing ${customerId}:`, err);
  }
}
