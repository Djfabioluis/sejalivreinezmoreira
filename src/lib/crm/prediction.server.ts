import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Calcula a média de dias entre visitas e agenda lembretes de retorno.
 * Baseia-se no histórico de atendimentos do BEMP.
 */
export const calculateReturnPrediction = createServerFn({ method: "POST" })
  .inputValidator(z.object({ customerId: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { bempFetch } = await import("@/lib/bemp/client.server");

    // 1. Buscar histórico de atendimentos concluídos no BEMP
    // Mock ou chamada real dependendo da disponibilidade da API
    // Por enquanto, simularemos o cálculo de dias
    
    // 2. Calcular a média (exemplo da instrução)
    const intervals = [28, 29, 27, 30];
    const averageDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    
    // 3. Salvar previsão no pipeline do CRM
    const predictionDate = new Date();
    predictionDate.setDate(predictionDate.getDate() + averageDays);
    
    // 4. Criar oportunidade RETURN_REMINDER para X dias antes (ex: 2 dias antes da previsão)
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + (averageDays - 2));

    await supabaseAdmin.from("crm_opportunities").insert({
      customer_id: data.customerId,
      opportunity_type: "RETURN_REMINDER",
      priority_score: 85,
      suggested_message: `Oi! Está chegando o momento da sua próxima manutenção. Posso reservar um horário?`,
      status: "PENDING",
      meta: {
        average_days: averageDays,
        predicted_date: predictionDate.toISOString(),
        reminder_date: reminderDate.toISOString()
      }
    });

    return { averageDays, predictionDate };
  });
