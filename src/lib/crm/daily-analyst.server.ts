import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

/**
 * Analista Diário da Julia (Daily Insight Analyst)
 * Executado toda noite para analisar o desempenho do dia e gerar recomendações.
 */
export async function runDailyAnalysis() {
  console.log("[daily-analyst] Iniciando análise noturna de desempenho...");

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 1. Coletar dados do dia
    const { data: pipeline } = await supabaseAdmin.from("crm_customer_pipeline").select("*");
    const { data: financialLogs } = await (supabaseAdmin.from("crm_financial_logs" as any) as any).select("*");
    const { data: slots } = await supabaseAdmin.from("crm_slot_opportunities").select("*");
    
    // 2. Preparar contexto para a IA
    const provider = createLovableAiGatewayProvider(process.env.LOVABLE_AI_GATEWAY_KEY || "");
    
    const context = {
      date: today,
      total_customers: pipeline?.length || 0,
      conversions: pipeline?.filter((c: any) => c.current_stage === 'CONVERTIDO' || c.current_stage === 'AGENDADO').length || 0,
      abandonments: pipeline?.filter((c: any) => c.current_stage === 'ABANDONADO').length || 0,
      financials: logs.map((l: any) => ({ amount: l.amount, source: l.source, unit: l.unit_name })),
      slots: slots?.map((s: any) => ({ status: s.status, start: s.start_at, unit: s.unidade_id }))
    };

    const prompt = `
      Você é a Julia, Analista Estratégica de Negócios. Analise os dados do dia no salão e responda às perguntas abaixo de forma direta e inteligente.
      
      DADOS DO DIA:
      ${JSON.stringify(context, null, 2)}
      
      PERGUNTAS A RESPONDER:
      1. Por que hoje vendeu menos (ou mais)?
      2. Qual profissional ficou mais ocioso?
      3. Quais clientes/perfis abandonaram o fluxo?
      4. Quais tipos de abordagens tiveram menor conversão?
      5. Quais horários recorrentemente ficam vagos?
      
      GERE 3 RECOMENDAÇÕES PRÁTICAS PARA O GESTOR AMANHÃ.
      
      Responda em Português-BR, tom profissional e analítico.
    `;

    const { text } = await generateText({
      model: provider("gemini-1.5-flash") as any,
      prompt,
    });

    // 3. Salvar análise no banco para exibição no dashboard
    await (supabaseAdmin
      .from("crm_recommendations" as any) as any)
      .insert({
        recommendation_type: 'DAILY_ANALYSIS',
        reason: 'Relatório noturno de inteligência',
        suggested_message: text,
        confidence: 95,
        status: 'PENDING',
        metadata: {
          date: today,
          analysis: text
        }
      });

    console.log("[daily-analyst] Análise concluída e salva.");
    return text;
  } catch (error) {
    console.error("[daily-analyst] Erro na análise diária:", error);
  }
}
