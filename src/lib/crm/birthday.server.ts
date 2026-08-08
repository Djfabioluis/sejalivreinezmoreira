import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BempService } from "../bemp-service.server";
import { logger } from "../observability/logger.server";

/**
 * Processo determinístico de aniversariantes.
 */
export async function processBirthdays() {
  const traceId = `birthday-${Math.random().toString(36).substring(7)}`;
  const now = new Date();
  
  // Horário de Brasília (BRT)
  const today = new Intl.DateTimeFormat('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit'
  }).format(now);
  
  const [day, month] = today.split('/');
  
  logger.info("BIRTHDAY_PROCESS_START", `Iniciando processamento de aniversariantes para ${day}/${month}`, { traceId });

  try {
    // 1. Precisamos buscar clientes do BEMP. 
    // Como a API do BEMP geralmente não permite listar todos os clientes de uma vez com filtros de data de nascimento eficientes via URL
    // vamos buscar do nosso próprio pipeline que já tem uma cópia dos clientes que interagiram recentemente.
    // Se precisarmos de uma busca global, teríamos que implementar um sync de clientes do BEMP.
    
    // Por enquanto, vamos consultar o pipeline e as conversas que já temos.
    const { data: customers, error } = await supabaseAdmin
      .from("crm_customer_pipeline")
      .select("phone, customer_name, customer_context:wa_conversas(customer_context, instance)");

    if (error) throw error;

    for (const customer of customers || []) {
      const context = (customer.customer_context as any)?.customer_context || {};
      const birthDate = context.birth_date || context.data_nascimento;
      
      if (!birthDate) continue;

      // Formatos comuns: YYYY-MM-DD, DD/MM/YYYY
      let bDay, bMonth;
      if (birthDate.includes('-')) {
        const parts = birthDate.split('-');
        bDay = parts[2].substring(0, 2);
        bMonth = parts[1];
      } else if (birthDate.includes('/')) {
        const parts = birthDate.split('/');
        bDay = parts[0];
        bMonth = parts[1];
      }

      if (bDay === day && bMonth === month) {
        await createBirthdayFollowup(customer, traceId);
      }
    }
  } catch (err: any) {
    logger.error("BIRTHDAY_PROCESS_FAILED", err.message, { traceId, error: err });
  }
}

async function createBirthdayFollowup(customer: any, traceId: string) {
  const phone = customer.phone;
  const contactName = customer.customer_name || "cliente";
  const firstName = contactName.split(' ')[0];
  const instance = (customer.customer_context as any)?.instance || "agente-5541998430354";

  // Evitar duplicidade (1 por ano)
  const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("crm_followups")
    .select("id")
    .eq("phone", phone)
    .eq("stage", "BIRTHDAY")
    .gt("created_at", startOfYear)
    .maybeSingle();

  if (existing) {
    logger.info("BIRTHDAY_ALREADY_SENT", `Aniversário já enviado para ${phone} este ano`, { traceId });
    return;
  }

  const messageTemplate = `Parabéns, {{primeiro_nome}}! 🎉\n\nHoje é o seu dia e queremos celebrar com você. Que tal um momento de cuidado especial aqui no salão?\n\nComo presente, você tem 10% de desconto em qualquer serviço hoje. Vamos agendar? 😊`;

  const { error } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone,
      stage: "BIRTHDAY",
      reason: "BIRTHDAY_CELEBRATION",
      status: "READY",
      scheduled_at: new Date().toISOString(),
      message_template: messageTemplate,
      priority: 90,
      metadata: {
        source: "birthday_engine",
        instance,
        traceId
      }
    } as any);

  if (error) {
    logger.error("BIRTHDAY_FOLLOWUP_FAILED", error.message, { phone, traceId });
  } else {
    logger.info("BIRTHDAY_FOLLOWUP_CREATED", `Follow-up de aniversário criado para ${phone}`, { traceId });
  }
}