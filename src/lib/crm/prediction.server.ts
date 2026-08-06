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
    const { bempFetch, BEMP_WEBHOOK_BASE } = await import("@/lib/bemp.server");

    // 1. Buscar histórico de atendimentos concluídos no BEMP
    // Usando o endpoint de histórico de agendamentos
    const qs = new URLSearchParams({ customer_id: data.customerId });
    const response: any = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_appointments?${qs.toString()}`);
    
    const appointments = response?.appointments || [];
    
    // Filtra agendamentos concluídos e ordena por data
    const completed = appointments
      .filter((a: any) => a.status === 'CONCLUIDO' || a.status === 'ATENDIDO')
      .sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    let averageDays = 30; // Default
    let intervals: number[] = [];

    if (completed.length >= 2) {
      for (let i = 1; i < completed.length; i++) {
        const prev = new Date(completed[i-1].start_at).getTime();
        const curr = new Date(completed[i].start_at).getTime();
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (diffDays > 5 && diffDays < 180) { // Filtra ruídos (visitas muito próximas ou muito distantes)
          intervals.push(diffDays);
        }
      }
      
      if (intervals.length > 0) {
        averageDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      }
    }
    
    // 3. Calcular datas
    const lastVisit = completed.length > 0 ? new Date(completed[completed.length-1].start_at) : new Date();
    const predictionDate = new Date(lastVisit);
    predictionDate.setDate(predictionDate.getDate() + averageDays);
    
    // 4. Criar oportunidade RETURN_REMINDER para X dias antes da previsão (ex: 2 dias antes, como no exemplo do 26º dia para ciclo de 28)
    const reminderDate = new Date(predictionDate);
    reminderDate.setDate(reminderDate.getDate() - 2);

    // Só cria se o lembrete for no futuro
    if (reminderDate > new Date()) {
      await supabaseAdmin.from("crm_opportunities" as any).insert({
        customer_id: data.customerId,
        opportunity_type: "RETURN_REMINDER",
        priority_score: 85,
        suggested_message: `Oi! Está chegando o momento da sua próxima manutenção. Posso reservar um horário?`,
        status: "PENDING",
        metadata: {
          average_days: averageDays,
          predicted_date: predictionDate.toISOString(),
          reminder_date: reminderDate.toISOString(),
          intervals: intervals
        }
      });
    }

    return { averageDays, predictionDate, reminderDate };
  });
