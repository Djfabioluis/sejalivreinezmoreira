// Server-only. Shared AI-agent runner for /api/chat (web) and /api/public/whatsapp.
import { convertToModelMessages, streamText, generateText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { bempFetch, getBempConfig, BEMP_WEBHOOK_BASE } from "@/lib/bemp.server";

export const DEFAULT_SYSTEM_PROMPT = `Você é a secretária virtual de um consultório integrado à plataforma Bemp.
Sua função é conversar de forma humanizada, calorosa e objetiva, em português do Brasil,
para agendar consultas e vender planos de assinatura.

REGRAS DE CONDUTA:
- Cumprimente com empatia. Chame o paciente pelo nome quando souber.
- Nunca invente serviços, profissionais, valores, durações, planos ou horários. Consulte SEMPRE as ferramentas.
- Confirme cada informação coletada em uma frase curta antes de seguir.
- Antes de criar o agendamento ou registrar interesse em assinatura, resuma tudo e peça uma confirmação explícita ("posso confirmar?").
- Formate valores como R$ e horários em português (ex.: "quinta, 12/09 às 13h30").

FLUXO DE AGENDAMENTO:
1. Cumprimente e pergunte o nome.
2. Peça telefone (país/DDD/número). Se o paciente não informar país, assuma 55.
3. Liste unidades usando list_salons e pergunte qual escolhe.
4. Liste serviços da unidade (list_services) com valor e duração; ajude o paciente a escolher.
5. (Opcional) Liste profissionais (list_professionals). Se o paciente não tiver preferência, siga sem profissional.
6. Pergunte a data preferida (YYYY-MM-DD). Use list_slots para mostrar horários disponíveis.
7. Após escolha do horário, calcule o "end" somando a duração do serviço ao "start".
8. ANTES de chamar create_appointment, chame list_cross_sell_suggestions passando salon_id, trigger_service_id (o serviço escolhido), a data (YYYY-MM-DD) e o telefone. O resultado já vem filtrado por elegibilidade e limites — respeite-o.
   - Se vier vazio, não ofereça nada extra.
   - Se vier com itens, ofereça-os na ordem retornada, informando valor e duração de cada. Faça isso apenas UMA vez por agendamento, sem insistir.
   - Para cada item ofertado, chame record_suggestion com status="ofertado".
9. Se o paciente aceitar um complemento, chame record_suggestion com status="aceito" para aquele serviço e agende-o também (create_appointment separado, encaixando na sequência). Se recusar, chame record_suggestion com status="recusado".
10. Chame create_appointment para o(s) serviço(s) confirmado(s).
11. Ao final, confirme o(s) agendamento(s) e ofereça mais ajuda.

CANCELAMENTO E REMARCAÇÃO:
- Quando o paciente pedir para cancelar, peça o telefone (país/DDD/número) se ainda não souber e use list_customer_appointments para localizar os agendamentos.
- Mostre os agendamentos encontrados (serviço, profissional, data/hora) e pergunte qual deles deseja cancelar.
- Antes de chamar cancel_appointment, confirme explicitamente ("Confirma o cancelamento de X no dia Y às Z?").
- Após cancelar com sucesso, pergunte se o paciente gostaria de remarcar para outro dia ou horário. Se sim, siga o fluxo normal de agendamento (list_services/list_slots/create_appointment) reaproveitando os dados que já tem.
- Se o paciente não quiser remarcar, agradeça e se coloque à disposição.

PLANOS DE ASSINATURA (vendas):
- Quando o paciente perguntar sobre assinaturas, mensalidades, planos, pacotes ou pedir para "assinar", use list_subscription_plans para listar os planos disponíveis com nome e valor.
- Se ele demonstrar interesse em um plano específico, use get_subscription_plan para trazer descrição completa, benefícios, condições e valores.
- Antes de registrar o interesse, colete: nome completo, telefone (país/DDD/número) e e-mail. Peça CPF quando o paciente ofertar ou quando perguntar sobre pagamento/nota fiscal.
- Use lookup_customer com o telefone para verificar se ele já tem cadastro na Bemp.
  * Se JÁ TIVER cadastro, confirme os dados encontrados ("Confirma que é você, {nome}?") e siga direto.
  * Se NÃO TIVER cadastro, avise gentilmente que o cadastro será criado junto com a assinatura e colete os dados que ainda faltam.
- Faça um resumo completo (plano escolhido, valor, dados do cliente) e peça confirmação explícita ("posso registrar sua assinatura?").
- Após a confirmação, chame register_subscription_lead com todos os dados coletados.
- Explique com clareza: a equipe da unidade vai receber esse pedido, entrará em contato para finalizar o pagamento e ativar a assinatura na Bemp. Ofereça-se para tirar dúvidas enquanto isso.

Se algo falhar, explique com gentileza e sugira alternativas.`;

const SANDBOX_NOTE = `

MODO SANDBOX ATIVO:
- Nenhum agendamento será gravado no sistema real (Bemp).
- Ao chamar create_appointment, o sistema devolverá um comprovante SIMULADO.
- Ao final, deixe claro para o paciente que se trata de uma simulação de teste.`;

function safeTool<T>(label: string, fn: () => Promise<T>) {
  return fn().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chat] tool ${label} falhou:`, message);
    return { error: message } as const;
  });
}

function buildTools(sandbox: boolean) {
  const base = {
    list_salons: tool({
      description: "Lista todas as unidades (salões) disponíveis na conta Bemp.",
      inputSchema: z.object({}),
      execute: async () =>
        safeTool("list_salons", async () => {
          const cfg = getBempConfig();
          return await bempFetch(`${cfg.apiBase}/salons`);
        }),
    }),
    list_services: tool({
      description: "Lista serviços de uma unidade, com preço e duração.",
      inputSchema: z.object({ salon_id: z.number() }),
      execute: async ({ salon_id }) =>
        safeTool("list_services", async () => {
          const cfg = getBempConfig();
          return await bempFetch(`${cfg.apiBase}/salons/${salon_id}/services`);
        }),
    }),
    list_professionals: tool({
      description: "Lista profissionais disponíveis para um serviço em uma unidade.",
      inputSchema: z.object({ salon_id: z.number(), service_id: z.number() }),
      execute: async ({ salon_id, service_id }) =>
        safeTool("list_professionals", async () => {
          const cfg = getBempConfig();
          return await bempFetch(
            `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals`,
          );
        }),
    }),
    list_slots: tool({
      description:
        "Lista horários disponíveis. Passe professional_id apenas se o paciente escolheu um profissional específico.",
      inputSchema: z.object({
        salon_id: z.number(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        date: z.string().describe("Data no formato YYYY-MM-DD"),
      }),
      execute: async ({ salon_id, service_id, professional_id, date }) =>
        safeTool("list_slots", async () => {
          const cfg = getBempConfig();
          const url = professional_id
            ? `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals/${professional_id}/slots/${date}`
            : `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/slots/${date}`;
          return await bempFetch(url);
        }),
    }),
    create_appointment: tool({
      description:
        "Cria o agendamento na Bemp. Só chame após confirmação explícita do paciente. O 'end' deve ser o 'start' + duração do serviço em minutos.",
      inputSchema: z.object({
        salon_id: z.number(),
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
          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: `SIM-${Date.now()}`,
              status: "simulated",
              message:
                "Agendamento SIMULADO (modo sandbox). Nada foi gravado na Bemp.",
              appointment: input,
              created_at: new Date().toISOString(),
            };
          }
          return await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
            method: "POST",
            body: JSON.stringify(input),
          });
        }),
    }),
    list_customer_appointments: tool({
      description:
        "Lista os agendamentos existentes de um paciente pelo telefone. Use antes de cancelar para achar o ID correto.",
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
        "Cancela um agendamento existente na Bemp. Só chame após confirmação explícita do paciente sobre qual agendamento cancelar.",
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
    list_subscription_plans: tool({
      description:
        "Lista os planos de assinatura cadastrados na Bemp (nome e resumo). Use quando o paciente perguntar sobre assinaturas, mensalidades, planos ou pacotes.",
      inputSchema: z.object({}),
      execute: async () =>
        safeTool("list_subscription_plans", async () => {
          const cfg = getBempConfig();
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
          const cfg = getBempConfig();
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
        "Registra o interesse do cliente em um plano de assinatura (cria o cadastro no nosso backend). Use SOMENTE após confirmação explícita do paciente. A equipe da unidade finaliza o pagamento e ativa a assinatura na Bemp.",
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
        "Retorna os serviços complementares elegíveis para oferecer ao paciente ANTES de finalizar o agendamento. Já aplica as regras cadastradas: unidade, serviço-gatilho, limites diários (por serviço e por cliente) e evita sugerir algo que o paciente já tem agendado no mesmo dia. Chame uma vez por agendamento, informando o serviço escolhido.",
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

          return {
            suggestions: capped,
            skipped,
            note:
              "Use list_services(salon_id) para obter valor e duração de cada suggested_service_id antes de oferecer.",
          };
        }),
    }),
    record_suggestion: tool({
      description:
        "Registra o resultado de uma sugestão de serviço complementar feita ao paciente (ofertado, aceito ou recusado). Use logo depois de oferecer e novamente quando o paciente responder.",
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

export type AgentOptions = { sandbox?: boolean };

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
  return `\n\nCONTEXTO TEMPORAL (fuso America/Sao_Paulo):\n- Hoje é ${humano} (${iso}), ${hora}.\n- SEMPRE use o ano ${iso.slice(0, 4)} ao montar datas para list_slots e create_appointment.\n- Quando o paciente disser "amanhã", "sexta", "próxima semana" etc., calcule a partir de ${iso}.\n- Nunca use datas de anos anteriores; se o ano não for informado, assuma o ano corrente e, se a data já passou, use o próximo ano.`;
}

export async function streamAgent(uiMessages: UIMessage[], opts: AgentOptions = {}) {
  const sandbox = opts.sandbox === true || envSandbox();
  const system = (await loadSystemPrompt()) + currentDateNote() + (sandbox ? SANDBOX_NOTE : "");
  return streamText({
    model: getModel(),
    system,
    messages: await convertToModelMessages(uiMessages),
    tools: buildTools(sandbox),
    stopWhen: stepCountIs(50),
  });
}

// Non-streaming run used by the WhatsApp webhook (needs the final text).
export async function runAgent(uiMessages: UIMessage[], opts: AgentOptions = {}): Promise<string> {
  const sandbox = opts.sandbox === true || envSandbox();
  const system = (await loadSystemPrompt()) + currentDateNote() + (sandbox ? SANDBOX_NOTE : "");
  const result = await generateText({
    model: getModel(),
    system,
    messages: await convertToModelMessages(uiMessages),
    tools: buildTools(sandbox),
    stopWhen: stepCountIs(50),
  });
  return result.text?.trim() || "Desculpe, tive um probleminha aqui. Pode repetir?";
}

