// Server-only. Shared AI-agent runner for /api/chat (web) and /api/public/whatsapp.
import { convertToModelMessages, streamText, generateText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { sanitizeCustomerText } from "@/lib/text-sanitize";
import {
  bempFetch,
  getBempConfig,
  BEMP_WEBHOOK_BASE,
  PROFESSIONAL_PREFERENCE_NOTE,
  extractBempAppointmentId,
  tryUpdateBempScheduleNote,
  withProfessionalPreferenceNote,
} from "@/lib/bemp.server";

export const DEFAULT_SYSTEM_PROMPT = `Você é a Julia, a secretária virtual humanizada do Salão Seja Livre.
Sua missão é realizar agendamentos e vender planos de assinatura de forma acolhedora, eficiente e natural.

DADOS CONFIÁVEIS DO ATENDIMENTO:
Nome do cliente: {{contactName}}
Telefone do WhatsApp: {{contactPhone}}
Unidade operacional: {{unitName}}

REGRAS OBRIGATÓRIAS:
- Se "Nome do cliente" estiver preenchido, NUNCA pergunte o nome.
- Se "Telefone do WhatsApp" estiver preenchido, NUNCA pergunte telefone ou DDD.
- Se "Unidade operacional" estiver preenchida, NUNCA pergunte qual unidade o cliente deseja. A unidade é fixa para esta instância.
- NÃO liste outras unidades quando uma unidade já estiver vinculada.
- NÃO reinicie o atendimento a cada mensagem. Se o cliente disser "Olá", responda com uma saudação breve e prossiga de onde pararam.
- NÃO repita perguntas já respondidas. Consulte o "ESTADO ATUAL" e o "HISTÓRICO".
- Faça apenas uma pergunta por vez, focando no próximo passo necessário para o agendamento.
- Use um tom caloroso, mas profissional. Emojis com moderação.

ESTADO ATUAL DO ATENDIMENTO (CONTEXTO):
{{customer_context_summary}}

REGRAS TÉCNICAS:
- Sempre use o ano corrente para agendamentos.
- Nunca mostre durações de serviços para o cliente.
- Formate preços como R$ XX,XX.
- Antes de confirmar o agendamento, SEMPRE apresente um resumo (Serviço, Profissional, Data, Horário) e peça confirmação explícita.
- Promoção do mês: Planos de assinatura SEM TAXA DE ADESÃO.
- Restrição: Unidade Centro Cívico não aceita planos de assinatura.`;

const SANDBOX_NOTE = `

MODO SANDBOX ATIVO:
- Nenhum agendamento será gravado no sistema real (Bemp).
- Ao chamar create_appointment, o sistema devolverá um comprovante SIMULADO.
- Ao final, deixe claro para o cliente que se trata de uma simulação de teste.`;

function safeTool<T>(label: string, fn: () => Promise<T>) {
  return fn().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chat] tool ${label} falhou:`, message);
    return { error: message } as const;
  });
}

function buildTools(sandbox: boolean, forcedUnitId?: string | null) {
  const base = {
    list_salons: tool({
      description: "Lista todas as unidades (salões) disponíveis na conta Bemp.",
      inputSchema: z.object({}),
      execute: async () =>
        safeTool("list_salons", async () => {
          const cfg = await getBempConfig();
          return await bempFetch(`${cfg.apiBase}/salons`);
        }),
    }),
    list_services: tool({
      description: "Lista serviços de uma unidade, com preço e duração.",
      inputSchema: z.object({ salon_id: z.number().optional() }),
      execute: async ({ salon_id }) =>
        safeTool("list_services", async () => {
          const cfg = await getBempConfig();
          const targetUnitId = forcedUnitId || salon_id;
          if (!targetUnitId) throw new Error("ID da unidade não fornecido.");
          return await bempFetch(`${cfg.apiBase}/salons/${targetUnitId}/services`);
        }),
    }),
    list_professionals: tool({
      description: "Lista profissionais disponíveis para um serviço em uma unidade.",
      inputSchema: z.object({ salon_id: z.number().optional(), service_id: z.number() }),
      execute: async ({ salon_id, service_id }) =>
        safeTool("list_professionals", async () => {
          const cfg = await getBempConfig();
          const targetUnitId = forcedUnitId || salon_id;
          if (!targetUnitId) throw new Error("ID da unidade não fornecido.");
          return await bempFetch(
            `${cfg.apiBase}/salons/${targetUnitId}/services/${service_id}/professionals`,
          );
        }),
    }),
    list_slots: tool({
      description:
        "Lista horários disponíveis. Passe professional_id apenas se o cliente escolheu um profissional específico.",
      inputSchema: z.object({
        salon_id: z.number().optional(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        date: z.string().describe("Data no formato YYYY-MM-DD"),
      }),
      execute: async ({ salon_id, service_id, professional_id, date }) =>
        safeTool("list_slots", async () => {
          const cfg = await getBempConfig();
          const targetUnitId = forcedUnitId || salon_id;
          if (!targetUnitId) throw new Error("ID da unidade não fornecido.");
          const url = professional_id
            ? `${cfg.apiBase}/salons/${targetUnitId}/services/${service_id}/professionals/${professional_id}/slots/${date}`
            : `${cfg.apiBase}/salons/${targetUnitId}/services/${service_id}/slots/${date}`;
          return await bempFetch(url);
        }),
    }),
    create_appointment: tool({
      description:
        "Cria o agendamento na Bemp. Só chame após confirmação explícita do cliente. O 'end' deve ser o 'start' + duração do serviço em minutos.",
      inputSchema: z.object({
        salon_id: z.number().optional(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        start: z.string().describe("ISO 8601, ex.: 2025-09-12T13:30:00.000-03:00"),
        end: z.string().describe("ISO 8601 correspondente ao término"),
        name: z.string(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async (input) =>
        safeTool("create_appointment", async () => {
          const targetUnitId = forcedUnitId || input.salon_id;
          if (!targetUnitId) throw new Error("ID da unidade não fornecido.");
          const fullInput = { ...input, salon_id: Number(targetUnitId) };

          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: `SIM-${Date.now()}`,
              status: "simulated",
              message:
                "Agendamento SIMULADO (modo sandbox). Nada foi gravado na Bemp. (Confirmação por WhatsApp não é enviada em sandbox.)",
              appointment: fullInput,
              created_at: new Date().toISOString(),
            };
          }
          const payload = withProfessionalPreferenceNote(fullInput);
          const result = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (input.professional_id != null) {
            await tryUpdateBempScheduleNote(result, PROFESSIONAL_PREFERENCE_NOTE);
          }
          // Registra e envia confirmação por WhatsApp (best-effort, não bloqueia o fluxo).
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { sendWhatsAppText, formatBrDateTime } = await import(
              "@/lib/whatsapp-send.server"
            );
            const phone = `${input.phone_country_code}${input.phone_area_code}${input.phone_number}`;
            const bempId = extractBempAppointmentId(result);
            // Tenta descobrir o nome do serviço (para uma mensagem mais humana).
            let serviceName: string | null = null;
            try {
              const cfg = await getBempConfig();
              const services = (await bempFetch(
                `${cfg.apiBase}/salons/${targetUnitId}/services`,
              )) as Array<Record<string, unknown>> | null;
              if (Array.isArray(services)) {
                const found = services.find((s) => Number(s.id) === input.service_id);
                if (found && typeof found.name === "string") serviceName = found.name;
              }
            } catch {
              // ignora — mensagem segue sem nome do serviço
            }
            const when = formatBrDateTime(input.start);
            const msg = serviceName
              ? `Oi ${input.name}! 💜 Seu agendamento de *${serviceName}* está confirmado para ${when}.\n\nSe precisar remarcar ou cancelar, é só me chamar por aqui. Até lá! ✨\n— Julia, Salão Seja Livre`
              : `Oi ${input.name}! 💜 Seu agendamento está confirmado para ${when}.\n\nSe precisar remarcar ou cancelar, é só me chamar por aqui. Até lá! ✨\n— Julia, Salão Seja Livre`;
            const sent = await sendWhatsAppText(phone, msg);
            await supabaseAdmin.from("agendamentos_notif" as never).insert({
              bemp_appointment_id: bempId,
              salon_id: String(targetUnitId),
              service_id: String(input.service_id),
              service_name: serviceName,
              start_at: input.start,
              phone,
              name: input.name,
              sandbox: false,
              confirmation_sent_at: sent ? new Date().toISOString() : null,
            } as never);
          } catch (err) {
            console.error("[create_appointment] falha ao registrar/notificar:", err);
          }
          return result;
        }),
    }),

    list_customer_appointments: tool({
      description:
        "Lista os agendamentos existentes de um cliente pelo telefone. Use antes de cancelar para achar o ID correto.",
      inputSchema: z.object({
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async ({ phone_country_code, phone_area_code, phone_number }) =>
        safeTool("list_customer_appointments", async () => {
          const qs = new URLSearchParams({
            phone_country_code,
            phone_area_code,
            phone_number,
          });
          return await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`);
        }),
    }),
    cancel_appointment: tool({
      description:
        "Cancela um agendamento existente na Bemp. Só chame após confirmação explícita do cliente sobre qual agendamento cancelar.",
      inputSchema: z.object({
        appointment_id: z.union([z.string(), z.number()]),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async ({ appointment_id, phone_country_code, phone_area_code, phone_number }) =>
        safeTool("cancel_appointment", async () => {
          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: String(appointment_id),
              status: "simulated_cancelled",
              message: "Cancelamento SIMULADO (modo sandbox). Nada foi alterado na Bemp.",
              cancelled_at: new Date().toISOString(),
            };
          }
          const qs = new URLSearchParams({
            phone_country_code,
            phone_area_code,
            phone_number,
            id: String(appointment_id),
          });
          return await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`, {
            method: "DELETE",
          });
        }),
    }),
    reschedule_appointment: tool({
      description:
        "Reagenda um agendamento existente na Bemp para uma nova data/hora, opcionalmente trocando serviço/unidade/profissional. Cria PRIMEIRO o novo agendamento e só depois cancela o antigo — assim o cliente nunca fica sem horário. Só chame após confirmação explícita do cliente.",
      inputSchema: z.object({
        old_appointment_id: z.union([z.string(), z.number()]),
        salon_id: z.number(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        old_start: z
          .string()
          .optional()
          .describe("ISO 8601 do horário ANTIGO (o que está sendo trocado), quando conhecido."),
        new_start: z.string().describe("ISO 8601 do novo início, ex.: 2025-09-12T13:30:00.000-03:00"),
        new_end: z.string().describe("ISO 8601 do novo término (start + duração)"),
        name: z.string(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async (input) =>
        safeTool("reschedule_appointment", async () => {
          if (sandbox) {
            const simId = `SIM-${Date.now()}`;
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const phone = `${input.phone_country_code}${input.phone_area_code}${input.phone_number}`;
              await supabaseAdmin.from("reagendamentos_hist" as never).insert({
                old_appointment_id: String(input.old_appointment_id),
                new_appointment_id: simId,
                salon_id: String(input.salon_id),
                service_id: String(input.service_id),
                professional_id:
                  input.professional_id != null ? String(input.professional_id) : null,
                old_start: input.old_start ?? null,
                new_start: input.new_start,
                phone,
                name: input.name,
                status: "simulated_rescheduled",
                warning: null,
                message_text: null,
                message_sent: false,
                message_sent_at: null,
                sandbox: true,
              } as never);
            } catch (err) {
              console.error("[reschedule_appointment] falha ao logar histórico (sandbox):", err);
            }
            return {
              sandbox: true,
              simulated: true,
              old_appointment_id: String(input.old_appointment_id),
              new_appointment: {
                id: simId,
                start: input.new_start,
                end: input.new_end,
                service_id: input.service_id,
                salon_id: input.salon_id,
              },
              status: "simulated_rescheduled",
              message:
                "Reagendamento SIMULADO (modo sandbox). Nada foi alterado na Bemp. (Confirmação por WhatsApp não é enviada em sandbox.)",
              rescheduled_at: new Date().toISOString(),
            };
          }

          // 1) Cria o NOVO agendamento primeiro. Se falhar, mantém o antigo.
          const createPayload = withProfessionalPreferenceNote({
            salon_id: input.salon_id,
            service_id: input.service_id,
            professional_id: input.professional_id,
            start: input.new_start,
            end: input.new_end,
            name: input.name,
            phone_country_code: input.phone_country_code,
            phone_area_code: input.phone_area_code,
            phone_number: input.phone_number,
          });
          const created = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
            method: "POST",
            body: JSON.stringify(createPayload),
          });
          if (input.professional_id != null) {
            await tryUpdateBempScheduleNote(created, PROFESSIONAL_PREFERENCE_NOTE);
          }
          const newBempId = extractBempAppointmentId(created);

          // 2) Cancela o antigo. Se falhar, mantém o novo e sinaliza pendência.
          let oldCancelled = true;
          let oldCancelError: string | null = null;
          try {
            const qs = new URLSearchParams({
              phone_country_code: input.phone_country_code,
              phone_area_code: input.phone_area_code,
              phone_number: input.phone_number,
              id: String(input.old_appointment_id),
            });
            await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`, {
              method: "DELETE",
            });
          } catch (err) {
            oldCancelled = false;
            oldCancelError = err instanceof Error ? err.message : String(err);
            console.error(
              "[reschedule_appointment] novo criado mas cancelamento do antigo falhou:",
              oldCancelError,
            );
          }

          // 3) Notifica cliente + atualiza agendamentos_notif (best-effort).
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { sendWhatsAppText, formatBrDateTime } = await import(
              "@/lib/whatsapp-send.server"
            );
            const phone = `${input.phone_country_code}${input.phone_area_code}${input.phone_number}`;
            let serviceName: string | null = null;
            try {
              const cfg = await getBempConfig();
              const services = (await bempFetch(
                `${cfg.apiBase}/salons/${input.salon_id}/services`,
              )) as Array<Record<string, unknown>> | null;
              if (Array.isArray(services)) {
                const found = services.find((s) => Number(s.id) === input.service_id);
                if (found && typeof found.name === "string") serviceName = found.name;
              }
            } catch {
              // segue sem nome do serviço
            }
            const when = formatBrDateTime(input.new_start);
            const msg = serviceName
              ? `Oi ${input.name}! 💜 Seu *${serviceName}* foi reagendado para ${when}. Tá tudo certinho por aqui.\n\nSe precisar mudar de novo, é só me chamar. Até lá! ✨\n— Julia, Salão Seja Livre`
              : `Oi ${input.name}! 💜 Seu atendimento foi reagendado para ${when}. Tá tudo certinho por aqui.\n\nSe precisar mudar de novo, é só me chamar. Até lá! ✨\n— Julia, Salão Seja Livre`;
            const sent = await sendWhatsAppText(phone, msg);

            // Insere linha nova para o cron de lembretes rodar sobre a nova data.
            await supabaseAdmin.from("agendamentos_notif" as never).insert({
              bemp_appointment_id: newBempId,
              salon_id: String(input.salon_id),
              service_id: String(input.service_id),
              service_name: serviceName,
              start_at: input.new_start,
              phone,
              name: input.name,
              sandbox: false,
              confirmation_sent_at: sent ? new Date().toISOString() : null,
            } as never);

            // Remove a linha antiga para não disparar lembrete de horário obsoleto.
            if (oldCancelled) {
              await supabaseAdmin
                .from("agendamentos_notif" as never)
                .delete()
                .eq("bemp_appointment_id", String(input.old_appointment_id));
            }

            // Grava o histórico de reagendamento para o painel.
            const finalStatus = oldCancelled ? "rescheduled" : "rescheduled_with_warning";
            const finalWarning = oldCancelled
              ? null
              : `Cancelamento do antigo (${input.old_appointment_id}) falhou: ${oldCancelError}`;
            await supabaseAdmin.from("reagendamentos_hist" as never).insert({
              old_appointment_id: String(input.old_appointment_id),
              new_appointment_id: newBempId,
              salon_id: String(input.salon_id),
              service_id: String(input.service_id),
              service_name: serviceName,
              professional_id:
                input.professional_id != null ? String(input.professional_id) : null,
              old_start: input.old_start ?? null,
              new_start: input.new_start,
              phone,
              name: input.name,
              status: finalStatus,
              warning: finalWarning,
              message_text: msg,
              message_sent: sent,
              message_sent_at: sent ? new Date().toISOString() : null,
              sandbox: false,
            } as never);
          } catch (err) {
            console.error("[reschedule_appointment] falha ao registrar/notificar:", err);
          }

          return {
            status: oldCancelled ? "rescheduled" : "rescheduled_with_warning",
            new_appointment: created,
            new_appointment_id: newBempId,
            old_appointment_id: String(input.old_appointment_id),
            old_cancelled: oldCancelled,
            warning: oldCancelled
              ? null
              : `O novo horário foi criado com sucesso, mas o cancelamento do antigo (${input.old_appointment_id}) falhou: ${oldCancelError}. Avise o cliente que a equipe vai remover o horário antigo manualmente.`,
            rescheduled_at: new Date().toISOString(),
          };
        }),
    }),
    list_subscription_plans: tool({
      description:
        "Lista os planos de assinatura cadastrados na Bemp (nome e resumo). Use quando o cliente perguntar sobre assinaturas, mensalidades, planos ou pacotes.",
      inputSchema: z.object({}),
      execute: async () =>
        safeTool("list_subscription_plans", async () => {
          const cfg = await getBempConfig();
          const data = await bempFetch(`${cfg.apiBase}/subscription_plans`);
          if (Array.isArray(data)) {
            return data.map((p) => {
              const plan = p as Record<string, unknown>;
              const desc = typeof plan.description === "string" ? plan.description : "";
              return {
                id: plan.id,
                name: plan.name,
                price: plan.price ?? plan.value ?? plan.total_price ?? null,
                summary: desc.length > 240 ? `${desc.slice(0, 237)}…` : desc,
              };
            });
          }
          return data;
        }),
    }),
    get_subscription_plan: tool({
      description:
        "Retorna os detalhes completos de um plano de assinatura (descrição, benefícios, valores, condições).",
      inputSchema: z.object({ plan_id: z.number() }),
      execute: async ({ plan_id }) =>
        safeTool("get_subscription_plan", async () => {
          const cfg = await getBempConfig();
          return await bempFetch(`${cfg.apiBase}/subscription_plans/${plan_id}`);
        }),
    }),
    lookup_customer: tool({
      description:
        "Verifica se um cliente já possui cadastro na Bemp pelo telefone. Retorna os dados quando existe, ou uma indicação de que precisa ser cadastrado.",
      inputSchema: z.object({
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async ({ phone_country_code, phone_area_code, phone_number }) =>
        safeTool("lookup_customer", async () => {
          const qs = new URLSearchParams({
            phone_country_code,
            phone_area_code,
            phone_number,
          });
          try {
            const data = await bempFetch(
              `${BEMP_WEBHOOK_BASE}/whatsapp_customer?${qs.toString()}`,
            );
            return { exists: true, customer: data };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (/404|not\s*found|não encontrado/i.test(message)) {
              return { exists: false, message: "Cliente ainda não cadastrado na Bemp." };
            }
            throw err;
          }
        }),
    }),
    register_subscription_lead: tool({
      description:
        "Registra o interesse do cliente em um plano de assinatura (cria o cadastro no nosso backend). Use SOMENTE após confirmação explícita do cliente. A equipe da unidade finaliza o pagamento e ativa a assinatura na Bemp.",
      inputSchema: z.object({
        plan_id: z.number(),
        plan_name: z.string(),
        name: z.string(),
        email: z.string().optional(),
        cpf: z.string().optional(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
        notes: z.string().optional(),
      }),
      execute: async (input) =>
        safeTool("register_subscription_lead", async () => {
          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: `SIM-LEAD-${Date.now()}`,
              status: "simulated",
              message:
                "Interesse em assinatura SIMULADO (modo sandbox). Nada foi gravado.",
              lead: input,
              created_at: new Date().toISOString(),
            };
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("leads_assinatura" as never)
            .insert({
              plano_id: input.plan_id,
              plano_nome: input.plan_name,
              nome: input.name,
              email: input.email ?? null,
              cpf: input.cpf ?? null,
              phone_country_code: input.phone_country_code,
              phone_area_code: input.phone_area_code,
              phone_number: input.phone_number,
              observacoes: input.notes ?? null,
              origem: "chat",
              sandbox: false,
              status: "novo",
            } as never)
            .select("id, created_at")
            .single();
          if (error) throw new Error(error.message);
          return {
            ok: true,
            lead_id: (data as { id: string } | null)?.id,
            message:
              "Interesse registrado com sucesso. A equipe da unidade receberá o pedido e entrará em contato para finalizar o pagamento e ativar a assinatura na Bemp.",
          };
        }),
    }),
    list_cross_sell_suggestions: tool({
      description:
        "Retorna os serviços complementares elegíveis para oferecer ao cliente ANTES de finalizar o agendamento. Já aplica as regras cadastradas: unidade, serviço-gatilho, limites diários (por serviço e por cliente) e evita sugerir algo que o cliente já tem agendado no mesmo dia. Chame uma vez por agendamento, informando o serviço escolhido.",
      inputSchema: z.object({
        salon_id: z.union([z.string(), z.number()]),
        trigger_service_id: z.union([z.string(), z.number()]),
        date: z.string().describe("Data do agendamento no formato YYYY-MM-DD"),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async ({
        salon_id,
        trigger_service_id,
        date,
        phone_country_code,
        phone_area_code,
        phone_number,
      }) =>
        safeTool("list_cross_sell_suggestions", async () => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const salonKey = String(salon_id);
          const triggerKey = String(trigger_service_id);
          const phoneKey = `${phone_country_code}${phone_area_code}${phone_number}`;

          const { data: regras, error } = await supabaseAdmin
            .from("sugestoes_cross_sell" as never)
            .select("*")
            .eq("trigger_service_id", triggerKey)
            .eq("ativo", true)
            .order("ordem", { ascending: true });
          if (error) throw new Error(error.message);

          const rules = ((regras ?? []) as unknown as Array<{
            id: string;
            salon_id: string | null;
            suggested_service_id: string;
            suggested_service_nome: string | null;
            ordem: number;
            limite_por_servico_dia: number | null;
            limite_por_cliente_dia: number | null;
            limite_por_conversa: number | null;
            observacoes: string | null;
          }>).filter((r) => !r.salon_id || r.salon_id === salonKey);

          if (rules.length === 0) return { suggestions: [], reason: "sem_regras" };

          // Elegibilidade: já agendado no mesmo dia
          let sameDayServiceIds = new Set<string>();
          try {
            const qs = new URLSearchParams({
              phone_country_code,
              phone_area_code,
              phone_number,
            });
            const appts = await bempFetch(
              `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`,
            );
            const list = Array.isArray(appts)
              ? appts
              : Array.isArray((appts as { data?: unknown[] })?.data)
                ? (appts as { data: unknown[] }).data
                : [];
            for (const a of list) {
              const rec = a as Record<string, unknown>;
              const startStr = String(rec.start ?? rec.date ?? rec.datetime ?? "");
              if (!startStr.startsWith(date)) continue;
              const sid = rec.service_id ?? rec.serviceId ?? (rec.service as Record<string, unknown> | undefined)?.id;
              if (sid != null) sameDayServiceIds.add(String(sid));
            }
          } catch {
            // se falhar, apenas segue sem filtrar por já-agendado
            sameDayServiceIds = new Set();
          }

          // Contagens do dia
          const dayStart = `${date}T00:00:00.000Z`;
          const dayEnd = `${date}T23:59:59.999Z`;
          const { data: regs } = await supabaseAdmin
            .from("sugestoes_registros" as never)
            .select("suggested_service_id, phone, status")
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd);
          const registros = (regs ?? []) as Array<{
            suggested_service_id: string;
            phone: string | null;
            status: string;
          }>;

          const countByService = new Map<string, number>();
          const countByCustomer = new Map<string, number>();
          for (const r of registros) {
            if (r.status === "ofertado" || r.status === "aceito") {
              countByService.set(
                r.suggested_service_id,
                (countByService.get(r.suggested_service_id) ?? 0) + 1,
              );
            }
            if (r.status === "ofertado" && r.phone === phoneKey) {
              countByCustomer.set(
                r.suggested_service_id,
                (countByCustomer.get(r.suggested_service_id) ?? 0) + 1,
              );
            }
          }
          const totalCustomerToday = Array.from(countByCustomer.values()).reduce(
            (a, b) => a + b,
            0,
          );

          const eligible: Array<{
            regra_id: string;
            suggested_service_id: string;
            suggested_service_nome: string | null;
            ordem: number;
            observacoes: string | null;
            limite_por_conversa: number | null;
          }> = [];
          const skipped: Array<{ suggested_service_id: string; motivo: string }> = [];

          for (const r of rules) {
            if (sameDayServiceIds.has(r.suggested_service_id)) {
              skipped.push({ suggested_service_id: r.suggested_service_id, motivo: "ja_agendado_hoje" });
              continue;
            }
            if (
              r.limite_por_servico_dia != null &&
              (countByService.get(r.suggested_service_id) ?? 0) >= r.limite_por_servico_dia
            ) {
              skipped.push({ suggested_service_id: r.suggested_service_id, motivo: "limite_servico_atingido" });
              continue;
            }
            if (
              r.limite_por_cliente_dia != null &&
              totalCustomerToday >= r.limite_por_cliente_dia
            ) {
              skipped.push({ suggested_service_id: r.suggested_service_id, motivo: "limite_cliente_atingido" });
              continue;
            }
            eligible.push({
              regra_id: r.id,
              suggested_service_id: r.suggested_service_id,
              suggested_service_nome: r.suggested_service_nome,
              ordem: r.ordem,
              observacoes: r.observacoes,
              limite_por_conversa: r.limite_por_conversa,
            });
          }

          const conversaCap = eligible.reduce(
            (min, e) => (e.limite_por_conversa != null ? Math.min(min, e.limite_por_conversa) : min),
            Number.MAX_SAFE_INTEGER,
          );
          const capped = conversaCap === Number.MAX_SAFE_INTEGER ? eligible : eligible.slice(0, conversaCap);
          const cappedOut = eligible.slice(capped.length).map((e) => ({
            suggested_service_id: e.suggested_service_id,
            motivo: "limite_conversa_atingido",
          }));
          const allSkipped = [...skipped, ...cappedOut];

          // Registra descartes para auditoria (não bloqueia se falhar)
          if (allSkipped.length > 0) {
            try {
              const ruleById = new Map(rules.map((r) => [r.suggested_service_id, r]));
              await supabaseAdmin.from("sugestoes_registros" as never).insert(
                allSkipped.map((s) => {
                  const r = ruleById.get(s.suggested_service_id);
                  return {
                    regra_id: r?.id ?? null,
                    salon_id: salonKey,
                    trigger_service_id: triggerKey,
                    suggested_service_id: s.suggested_service_id,
                    suggested_service_nome: r?.suggested_service_nome ?? null,
                    phone: phoneKey,
                    status: "descartado",
                    sandbox,
                    observacao: s.motivo,
                  };
                }) as never,
              );
            } catch {
              // silencioso
            }
          }

          return {
            suggestions: capped,
            skipped: allSkipped,
            note:
              "Use list_services(salon_id) para obter valor e duração de cada suggested_service_id antes de oferecer.",
          };
        }),
    }),
    record_suggestion: tool({
      description:
        "Registra o resultado de uma sugestão de serviço complementar feita ao cliente (ofertado, aceito ou recusado). Use logo depois de oferecer e novamente quando o cliente responder.",
      inputSchema: z.object({
        regra_id: z.string().uuid().optional(),
        salon_id: z.union([z.string(), z.number()]).optional(),
        trigger_service_id: z.union([z.string(), z.number()]).optional(),
        suggested_service_id: z.union([z.string(), z.number()]),
        suggested_service_nome: z.string().optional(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
        status: z.enum(["ofertado", "aceito", "recusado"]),
        observacao: z.string().optional(),
      }),
      execute: async (input) =>
        safeTool("record_suggestion", async () => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("sugestoes_registros" as never)
            .insert({
              regra_id: input.regra_id ?? null,
              salon_id: input.salon_id != null ? String(input.salon_id) : null,
              trigger_service_id:
                input.trigger_service_id != null ? String(input.trigger_service_id) : null,
              suggested_service_id: String(input.suggested_service_id),
              suggested_service_nome: input.suggested_service_nome ?? null,
              phone: `${input.phone_country_code}${input.phone_area_code}${input.phone_number}`,
              status: input.status,
              sandbox,
              observacao: input.observacao ?? null,
            } as never);
          if (error) throw new Error(error.message);
          return { ok: true };
        }),
    }),
    check_subscription_balance: tool({
      description:
        "Estima quantas visitas restam no plano de assinatura de um cliente. Combina os dados de cadastro na Bemp (plano ativo e cota informada) com a contagem de agendamentos futuros do cliente no mês atual. É uma ESTIMATIVA — a API pública da Bemp não expõe o saldo real. Sempre ofereça ao cliente a opção de pedir uma verificação manual pela equipe.",
      inputSchema: z.object({
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async ({ phone_country_code, phone_area_code, phone_number }) =>
        safeTool("check_subscription_balance", async () => {
          const qs = new URLSearchParams({
            phone_country_code,
            phone_area_code,
            phone_number,
          });

          let customer: Record<string, unknown> | null = null;
          try {
            const data = await bempFetch(
              `${BEMP_WEBHOOK_BASE}/whatsapp_customer?${qs.toString()}`,
            );
            customer = (data ?? null) as Record<string, unknown> | null;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (/404|not\s*found|não encontrado/i.test(message)) {
              return {
                found: false,
                message:
                  "Não encontramos cadastro na Bemp para esse telefone. Ofereça registrar uma consulta de saldo com a equipe usando register_balance_inquiry.",
              };
            }
            throw err;
          }

          const pickPlan = (obj: Record<string, unknown> | null | undefined) => {
            if (!obj || typeof obj !== "object") return null;
            const candidates = [
              obj.subscription,
              obj.subscription_plan,
              obj.plan,
              obj.active_subscription,
              (obj as { customer?: Record<string, unknown> }).customer?.subscription,
            ];
            for (const c of candidates) {
              if (c && typeof c === "object") return c as Record<string, unknown>;
            }
            return null;
          };
          const plan = pickPlan(customer);
          const planName =
            (plan?.name as string | undefined) ??
            (plan?.plan_name as string | undefined) ??
            (customer?.plan_name as string | undefined) ??
            null;
          const planQuotaRaw =
            plan?.monthly_quota ??
            plan?.visits_per_month ??
            plan?.quota ??
            plan?.limit ??
            plan?.max_visits ??
            null;
          const planQuota =
            typeof planQuotaRaw === "number"
              ? planQuotaRaw
              : typeof planQuotaRaw === "string" && /^\d+$/.test(planQuotaRaw)
                ? Number(planQuotaRaw)
                : null;

          let scheduledThisMonth = 0;
          let listedTotal = 0;
          try {
            const appts = await bempFetch(
              `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`,
            );
            const list = Array.isArray(appts)
              ? appts
              : Array.isArray((appts as { data?: unknown[] })?.data)
                ? (appts as { data: unknown[] }).data
                : [];
            listedTotal = list.length;
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const monthPrefix = `${y}-${m}`;
            for (const a of list) {
              const rec = a as Record<string, unknown>;
              const startStr = String(rec.start ?? rec.date ?? rec.datetime ?? "");
              const status = String(rec.status ?? "").toLowerCase();
              if (!startStr.startsWith(monthPrefix)) continue;
              if (/cancel/.test(status)) continue;
              scheduledThisMonth += 1;
            }
          } catch {
            // silencioso; devolve estimativa parcial
          }

          const remaining =
            planQuota != null ? Math.max(planQuota - scheduledThisMonth, 0) : null;

          return {
            found: true,
            plan_name: planName,
            plan_quota_monthly: planQuota,
            scheduled_this_month: scheduledThisMonth,
            estimated_remaining_this_month: remaining,
            appointments_listed: listedTotal,
            confidence: planQuota != null ? "estimativa" : "parcial",
            disclaimer:
              "A API pública da Bemp não expõe o saldo real do plano. Estes números são uma ESTIMATIVA baseada nos agendamentos futuros do mês. Ofereça ao cliente encaminhar para a equipe (use register_balance_inquiry) para confirmação oficial.",
          };
        }),
    }),
    register_balance_inquiry: tool({
      description:
        "Registra um pedido de verificação de saldo de visitas do plano de assinatura para a equipe humana confirmar na Bemp. Use quando o cliente quiser o número exato ou quando a estimativa não estiver disponível.",
      inputSchema: z.object({
        name: z.string(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
        plan_name: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) =>
        safeTool("register_balance_inquiry", async () => {
          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: `SIM-SALDO-${Date.now()}`,
              message:
                "Pedido de verificação de saldo SIMULADO (sandbox). Nada foi gravado.",
            };
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("leads_assinatura" as never)
            .insert({
              plano_id: null,
              plano_nome: input.plan_name ?? null,
              nome: input.name,
              email: null,
              cpf: null,
              phone_country_code: input.phone_country_code,
              phone_area_code: input.phone_area_code,
              phone_number: input.phone_number,
              observacoes: `[Consulta de saldo] ${input.notes ?? "Cliente solicitou verificação do saldo de visitas do plano."}`,
              origem: "consulta_saldo",
              sandbox: false,
              status: "novo",
            } as never)
            .select("id, created_at")
            .single();
          if (error) throw new Error(error.message);
          return {
            ok: true,
            lead_id: (data as { id: string } | null)?.id,
            message:
              "Pedido registrado. A equipe da unidade vai confirmar o saldo real na Bemp e retornar o contato.",
          };
        }),
    }),

    request_human_handoff: tool({
      description:
        "Registra que o cliente deseja falar com um atendente humano. Use quando o cliente pedir para falar com uma pessoa, quando reclamar de problema não resolvido, ou quando o assunto sair do escopo (reembolso, laudo, situação delicada). Confirme o motivo antes de chamar.",
      inputSchema: z.object({
        name: z.string().optional(),
        phone_country_code: z.string().optional(),
        phone_area_code: z.string().optional(),
        phone_number: z.string().optional(),
        phone: z.string().optional().describe("telefone completo, se conhecido"),
        motivo: z.string().describe("resumo curto do motivo do contato humano"),
        canal: z.enum(["chat", "whatsapp"]).default("chat"),
        observacoes: z.string().optional(),
      }),
      execute: async (input) =>
        safeTool("request_human_handoff", async () => {
          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: `SIM-HANDOFF-${Date.now()}`,
              message: "Solicitação de atendimento humano SIMULADA (sandbox).",
            };
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("atendimentos_humanos" as never)
            .insert({
              nome: input.name ?? null,
              phone: input.phone ?? null,
              phone_country_code: input.phone_country_code ?? null,
              phone_area_code: input.phone_area_code ?? null,
              phone_number: input.phone_number ?? null,
              motivo: input.motivo,
              canal: input.canal ?? "chat",
              observacoes: input.observacoes ?? null,
              status: "aguardando",
              sandbox: false,
            } as never)
            .select("id, created_at")
            .single();
          if (error) throw new Error(error.message);
          return {
            ok: true,
            id: (data as { id: string } | null)?.id,
            message:
              "Solicitação registrada. Um atendente humano vai retornar o contato em breve.",
          };
        }),
    }),
  };
  return base;
}



// Backwards-compat export (used by any older imports).
export const bempTools = buildTools(false);

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const gateway = createLovableAiGatewayProvider(key);
  return gateway("google/gemini-3.6-flash");
}

export async function loadSystemPrompt(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo")
      .eq("id", 1)
      .maybeSingle();
    const conteudo = (data as { conteudo?: string } | null)?.conteudo?.trim();
    return conteudo && conteudo.length > 0 ? conteudo : DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.error("[chat] falha ao carregar base de conhecimento:", err);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

export type AgentOptions = { 
  sandbox?: boolean; 
  persona?: string; 
  unidadeId?: string | null;
  unitName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  customerContext?: any;
};

function sanitizeMessagesForModel(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) =>
      part.type === "text" ? { ...part, text: sanitizeCustomerText(part.text) } : part,
    ),
  }));
}

function envSandbox(): boolean {
  return process.env.SANDBOX_MODE === "1" || process.env.SANDBOX_MODE === "true";
}

function currentDateNote(): string {
  const tz = "America/Sao_Paulo";
  const now = new Date();
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const humano = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return `\n\nCONTEXTO TEMPORAL (fuso America/Sao_Paulo):\n- Hoje é ${humano} (${iso}), ${hora}.\n- SEMPRE use o ano ${iso.slice(0, 4)} ao montar datas para list_slots e create_appointment.\n- Quando o cliente disser "amanhã", "sexta", "próxima semana" etc., calcule a partir de ${iso}.\n- Nunca use datas de anos anteriores; se o ano não for informado, assuma o ano corrente e, se a data já passou, use o próximo ano.\n- NÃO pergunte o telefone, ele já é conhecido.`;
}

const LANGUAGE_GUARD = `\n\nREFORÇO DE ESCRITA (obrigatório):\n- Escreva em português brasileiro correto, sem engolir letras nem trocar verbos parecidos.\n- Ao pedir o nome do cliente, use exatamente a frase "como posso te chamar?". Nunca escreva "te ligar", "te chegar", "te chamo" ou variações estranhas.\n- Nunca troque "chamar" por "ligar", "ajudar" por "ajeitar", "marcar" por "mandar", "confirmar" por "conformar" — releia mentalmente cada frase antes de enviar.\n- Se perceber uma palavra estranha ou incompleta, reescreva a frase inteira antes de responder.`;

const NO_DURATION_GUARD = `\n\nREGRA FINAL DE SAÍDA AO CLIENTE (obrigatória):\n- Antes de responder, remova qualquer trecho como "duração aprox. 60 min", "duração 1h", "tempo 40 minutos" ou qualquer duração entre parênteses ao lado de serviço/preço.\n- Nunca escreva "(duração aprox. ...)" em nenhuma resposta ao cliente.`;

export async function streamAgent(uiMessages: UIMessage[], opts: AgentOptions = {}) {
  const sandbox = opts.sandbox === true || envSandbox();
  
  // 1. Contexto de Unidade
  let unitContext = "";
  if (opts.unidadeId) {
    unitContext = `\n\nUNIDADE: ID ${opts.unidadeId}${opts.unitName ? ` (${opts.unitName})` : ""}.`;
  }

  // 2. Dados Confiáveis do Contato
  const contactInfo = `\n\nDADOS DO CONTATO:\n- Nome conhecido: ${opts.contactName || "não identificado"}\n- Telefone: ${opts.contactPhone || "não identificado"}`;
  
  // 3. Resumo do Contexto Estruturado (customer_context)
  let contextSummary = "Nenhum dado registrado ainda.";
  if (opts.customerContext && Object.keys(opts.customerContext).length > 0) {
    const ctx = opts.customerContext;
    contextSummary = `
- Serviço: ${ctx.requestedService || "não informado"}
- Profissional: ${ctx.preferredProfessional || "não informado"}
- Data: ${ctx.preferredDate || "não informada"}
- Horário: ${ctx.preferredTime || "não informado"}
- Nome Confirmado: ${ctx.name || "não informado"}
- Etapa: ${ctx.currentStep || "início"}
`.trim();
  }

  const basePrompt = await loadSystemPrompt();
  
  // Injetar dados conhecidos no prompt base se as chaves existirem
  let system = basePrompt.replace("{{contactName}}", opts.contactName || "não identificado")
    .replace("{{contactPhone}}", opts.contactPhone || "não identificado")
    .replace("{{unitName}}", opts.unitName || "não vinculada")
    .replace("{{customer_context_summary}}", contextSummary);

  system = system + 
           currentDateNote() + 
           LANGUAGE_GUARD + 
           NO_DURATION_GUARD + 
           unitContext +
           contactInfo +
           (sandbox ? SANDBOX_NOTE : "") +
           (opts.persona ? `\n\n${opts.persona}` : "");

  return streamText({
    model: getModel(),
    system,
    messages: await convertToModelMessages(sanitizeMessagesForModel(uiMessages)),
    tools: buildTools(sandbox, opts.unidadeId),
    stopWhen: stepCountIs(5),
  });
}

// Non-streaming run used by the WhatsApp webhook (needs the final text).
export async function runAgentWithLogging(params: {
  instance: string;
  remoteJid: string;
  messageId: string;
  pushName?: string;
  text: string;
  unidadeId: string;
  phone: string;
  conversationKey: string;
}) {
  const { instance, messageId, phone, conversationKey, unidadeId, pushName } = params;

  try {
    await logEvent({ instance, messageId, event: "history_load_started", status: "started" });
    const { getConversationHistory } = await import("./evolution/conversation.server");
    const historyData = await getConversationHistory(conversationKey);

    if (!historyData) {
      await logEvent({ instance, messageId, event: "history_load_failed", status: "using_minimal_context" });
    } else {
      await logEvent({ 
        instance, 
        messageId, 
        event: "history_loaded", 
        status: "success",
        payload: { historyCount: (historyData.messages as any[])?.length || 0 } 
      });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: unit } = await supabaseAdmin
      .from("unidades" as never)
      .select("nome")
      .eq("id", unidadeId)
      .maybeSingle();

    const unitName = (unit as any)?.nome || "Unidade não identificada";

    await logEvent({
      instance,
      messageId,
      event: "ai_context_prepared",
      status: "success",
      payload: {
        contactNameAvailable: !!pushName || !!historyData?.contact_name,
        contactPhoneAvailable: !!phone,
        unitAvailable: !!unidadeId,
        historyCount: (historyData?.messages as any[])?.length || 0,
        currentMessageAvailable: !!params.text
      }
    });

    await logEvent({ instance, messageId, event: "ai_request_started", status: "started" });

    // Preparar mensagens para a IA
    const historyMessages: UIMessage[] = (historyData?.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      parts: Array.isArray(m.parts) ? m.parts : [{ type: "text", text: String(m.parts || "") }],
      content: Array.isArray(m.parts) ? m.parts.map((p: any) => p.text).join(" ") : String(m.parts || ""),
    } as UIMessage));

    // Injetar mensagem atual se não estiver no histórico
    if (!historyMessages.find(m => m.id === messageId)) {
      historyMessages.push({ 
        id: messageId, 
        role: "user", 
        content: params.text,
        parts: [{ type: "text", text: params.text }]
      } as UIMessage);
    }

    const reply = await runAgent(historyMessages, {
      unidadeId,
      unitName,
      contactName: pushName || (historyData?.contact_name as string),
      contactPhone: phone,
      customerContext: historyData?.customer_context || {}
    });

    if (!reply || reply.trim().length === 0) {
      await logEvent({ instance, messageId, event: "ai_empty_response", status: "failed" });
      return;
    }

    await logEvent({ instance, messageId, event: "ai_request_completed", status: "success" });

    const { replyToUser } = await import("./evolution/reply.server");
    await replyToUser({
      instance,
      phone,
      text: reply,
      conversationKey,
      messageId
    });

  } catch (error) {
    console.error("[chat] Erro em runAgentWithLogging:", error);
    await logEvent({
      instance,
      messageId,
      event: "ai_request_failed",
      status: "error",
      errorDetail: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function runAgent(uiMessages: UIMessage[], opts: AgentOptions = {}): Promise<string> {
  const sandbox = opts.sandbox === true || envSandbox();
  
  let unitContext = "";
  if (opts.unidadeId) {
    unitContext = `\n\nUNIDADE: ID ${opts.unidadeId}${opts.unitName ? ` (${opts.unitName})` : ""}.`;
  }

  const contactInfo = `\n\nDADOS DO CONTATO:\n- Nome conhecido: ${opts.contactName || "não identificado"}\n- Telefone: ${opts.contactPhone || "não identificado"}`;

  let contextSummary = "Nenhum dado registrado ainda.";
  if (opts.customerContext && Object.keys(opts.customerContext).length > 0) {
    const ctx = opts.customerContext;
    contextSummary = `
- Serviço: ${ctx.requestedService || "não informado"}
- Profissional: ${ctx.preferredProfessional || "não informado"}
- Data: ${ctx.preferredDate || "não informada"}
- Horário: ${ctx.preferredTime || "não informado"}
- Nome Confirmado: ${ctx.name || "não informado"}
- Etapa: ${ctx.currentStep || "início"}
`.trim();
  }

  const basePrompt = await loadSystemPrompt();
  
  let fullSystem = basePrompt.replace("{{contactName}}", opts.contactName || "não identificado")
    .replace("{{contactPhone}}", opts.contactPhone || "não identificado")
    .replace("{{unitName}}", opts.unitName || "não vinculada")
    .replace("{{customer_context_summary}}", contextSummary);

  fullSystem = fullSystem + 
               currentDateNote() + 
               LANGUAGE_GUARD + 
               NO_DURATION_GUARD + 
               unitContext + 
               contactInfo + 
               (sandbox ? SANDBOX_NOTE : "") + 
               (opts.persona ? `\n\n${opts.persona}` : "");

  const result = await generateText({
    model: getModel(),
    system: fullSystem,
    messages: await convertToModelMessages(sanitizeMessagesForModel(uiMessages)),
    tools: buildTools(sandbox, opts.unidadeId),
    stopWhen: stepCountIs(5),
    abortSignal: AbortSignal.timeout(60000),
  });

  return sanitizeCustomerText(result.text?.trim() || "Desculpe, tive um probleminha aqui. Pode repetir?");
}

