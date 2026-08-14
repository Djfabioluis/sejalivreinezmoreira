// Server-only. Shared AI-agent runner for /api/chat (web) and /api/public/whatsapp.
import { convertToModelMessages, streamText, generateText, stepCountIs, tool, type UIMessage } from "ai";
import { type AgentOptions } from "./agent-types";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { sanitizeCustomerText } from "@/lib/text-sanitize";
import { logEvent } from "./evolution/logger.server";
import { logger } from "@/lib/observability/logger.server";
import { classifyFailure, describeError, sanitizeErrorText } from "./evolution/failure";
import { updateCustomerPipeline, inferStageFromTool } from "@/lib/crm.server";
import { normalizeServiceSearchText, SERVICE_CATEGORY_ALIASES, type ServiceCategory } from "./service-utils";
export { normalizeServiceSearchText };
import { PromotionService, type Promotion } from "./promotion-service.server";
import {
  buildBookingContextBlock,
  enforceNoSubscriptionFlow,
  type BookingContext,
} from "@/lib/booking/context";

import { EvolutionService } from "./evolution/evolution-service.server";
import {
  BempService,
  extractBempAppointmentId,
} from "@/lib/bemp-service.server";
import { priceAuditor } from "./booking/price-auditor.server";
import { PerformanceTrace } from "./evolution/performance.server";

const PROFESSIONAL_PREFERENCE_NOTE = "com preferência";

export const MANDATORY_SYSTEM_RULES = `REGRAS OBRIGATÓRIAS DO SISTEMA (NUNCA IGNORAR):
- O NOME DO CLIENTE deve ser usado em TODA resposta inicial ou saudação.
- Se "Nome do cliente" estiver preenchido com um nome real (não genericamente "Cliente"), use-o obrigatoriamente: "Olá, {{contactName}}! 💜".
- NUNCA invente nomes. Se o nome for desconhecido ou genérico (como "Cliente"), use apenas "Olá! Tudo bem?".
- JAMAIS exiba ícones de placeholder ou a palavra "Cliente" como se fosse o nome da pessoa.
- ENDEREÇO DA UNIDADE CENTRO: O endereço OBRIGATÓRIO é "Rua Marechal Floriano Peixoto, 45". Nunca invente nem use endereços antigos ou "2º andar".
- UNIDADE BOULEVARD: O endereço é "Rodovia BR-116, 16303, Shopping Boulevard". Regra Especial: Harmonização de bumbum ou barriga nesta unidade é realizada por parceiros e deve ser encaminhada para (41) 99952-9624.
- UNIDADE VENTURA: O endereço é "Rua Itacolomi, 292, Ventura Shopping".
- UNIDADE OPERACIONAL: A unidade ativa é determinada pelo número de WhatsApp que recebeu a conversa. 
- A Julia deve SEMPRE responder pela instância correta da unidade. Se o cliente pedir para trocar de unidade, o sistema trocará automaticamente o número de saída para o número oficial daquela unidade.
- Se a "Unidade operacional" ({{unitName}}) estiver preenchida, você está PROIBIDA de perguntar qual unidade o cliente deseja. Considere esta a unidade escolhida.

- REGRA DE PREÇO ABSOLUTA: Você está PROIBIDA de informar preços de serviços baseada em sua memória, conhecimento prévio ou inferência.
- PREÇO SÓ PODE SER INFORMADO se vier explicitamente da ferramenta 'list_services'.
- Se o cliente perguntar o preço e você ainda não chamou 'list_services' para a unidade atual, você DEVE chamar a ferramenta antes de responder.
- Se a ferramenta não retornar um preço para o serviço específico, responda: "Vou confirmar o valor certinho para você. 💜". NUNCA estime ou chute um valor.
- Formate preços exatamente como retornados, no padrão R$ XX,XX.

- NÃO ofereça troca de unidade nem pergunte "Centro ou outra unidade?" a menos que o cliente peça explicitamente para mudar.
- NÃO repita perguntas já respondidas. O bloco "CONTEXTO DE AGENDAMENTO" é a VERDADE do atendimento: tudo que estiver diferente de UNKNOWN já foi informado e está PROIBIDO perguntar novamente.
- Pergunte SOMENTE o campo indicado em "PRÓXIMO CAMPO A OBTER".
- Se o serviço já estiver no contexto, NUNCA pergunte "Qual serviço deseja realizar?", mesmo que a mensagem atual fale apenas de data, período ou horário.
- ASSINATURA/PLANO: só existe fluxo de assinatura quando "Intenção de assinatura/plano declarada pelo cliente" for SIM. Caso seja NÃO, está TERMINANTEMENTE PROIBIDO: chamar validate_subscription_phone, pedir "telefone cadastrado", perguntar "você possui assinatura?", oferecer validar plano/benefício ou mencionar plano/assinatura/benefício. Siga o agendamento comum.
- O fato de um serviço também existir em algum plano NÃO significa que o cliente quer usar assinatura. Nunca investigue plano por conta própria.
- Quando o cliente responder "isso", "sim", "correto" ou "exatamente", trate como resposta à SUA última pergunta e siga o fluxo. Não reinicie o atendimento.
- SAUDAÇÃO: cumprimente apenas quando "Cliente já foi saudado nesta conversa" for NÃO. Se for SIM, continue a conversa naturalmente, sem "Olá, {{contactName}}!". Se o cliente disser apenas "Oi" ou "Olá", você pode responder com uma saudação curta e perguntar como pode ajudar, mas evite repetir saudações longas em todas as mensagens.
- Se o profissional desejado não tiver agenda, informe o cliente e ofereça lista de espera (join_waiting_list).
- Faça apenas uma pergunta por vez.
- Use um tom caloroso, mas profissional. Emojis com moderação.
- Quando a intenção MECHAS for detectada e a promoção PACOTE_MECHAS_MENSAL estiver ativa, você DEVE oferecer obrigatoriamente o "Pacote de Mechas" por "R$ 289,90" antes de qualquer outra coisa.
- Para identificar assinantes (somente com intenção explícita), utilize EXCLUSIVAMENTE o telefone cadastrado. NUNCA mencione a palavra "CPF".`;

export const DEFAULT_KNOWLEDGE_PROMPT = `Você é a Julia, a secretária virtual humanizada do Salão Seja Livre.
Sua missão é realizar agendamentos e vender planos de assinatura de forma acolhedora, eficiente e natural.

DADOS DO ATENDIMENTO:
Nome do cliente: {{contactName}}
Telefone: {{contactPhone}}
Unidade: {{unitName}}
TraceID: {{traceId}}

CONTEXTO DE AGENDAMENTO (ESTADO OFICIAL — NÃO PERGUNTE O QUE JÁ ESTIVER PREENCHIDO):
{{booking_context_block}}

DADOS JÁ CONHECIDOS (NÃO PERGUNTE ESTES):
{{customer_context_summary}}

PROMOÇÕES ATIVAS E CONFIRMADAS:
{{active_promotions_block}}`;


export const DEFAULT_SYSTEM_PROMPT = `${MANDATORY_SYSTEM_RULES}

${DEFAULT_KNOWLEDGE_PROMPT}`;

const SANDBOX_NOTE = `

MODO SANDBOX ATIVO:
- Nenhum agendamento será gravado no sistema real (Bemp).
- Ao chamar create_appointment, o sistema devolverá um comprovante SIMULADO.
- Ao final, deixe claro para o cliente que se trata de uma simulação de teste.`;

export type ToolCtx = { conversationKey?: string; effectiveUnitId?: string | null };

export function runTool<T>(label: string, fn: () => Promise<T>, ctx: ToolCtx = {}) {
  const startedAt = Date.now();
  const traceId = Math.random().toString(36).substring(7);
  const base = `traceId=${traceId}, tool=${label}, conversationKey=${ctx.conversationKey ?? "n/a"}`;
  
  console.log(`[chat] tool_started: ${base}`);
  
  return fn()
    .then(async (result) => {
      console.log(`[chat] tool_completed: ${base}, durationMs=${Date.now() - startedAt}`);
      
      if (ctx.conversationKey) {
        const stage = inferStageFromTool(label, result);
        if (stage) {
          await updateCustomerPipeline({
            phone: ctx.conversationKey,
            stage,
            abandonmentReason: (result as any)?.abandon_trigger
          });
        }
      }
      return result;
    })
    .catch(async (err) => {
      const info = describeError(err);
      const failure = classifyFailure(err);
      const durationMs = Date.now() - startedAt;

      console.error(
        `[chat] tool_failed: ${base}, durationMs=${durationMs}, code=${failure.code}, integration=${failure.code.startsWith('bemp') ? 'BEMP' : 'INTERNAL'}, statusCode=${info.status}, message=${info.message}`
      );

      if (failure.escalate && ctx.conversationKey) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("wa_conversas").update({
            attendance_mode: 'HUMAN',
            last_error_code: failure.code,
            last_error_at: new Date().toISOString()
          } as any).eq("phone", ctx.conversationKey);
          console.log(`[chat] human_handoff_triggered: ${base}, reason=${failure.code}`);
        } catch (handoffErr) {
          console.error(`[chat] handoff_failed: ${base}`, handoffErr);
        }
      }

      return {
        success: false,
        code: failure.code,
        message: failure.userMessage,
        error: info.message,
        traceId
      } as const;
    });
}

export function safeTool<T>(label: string, fn: () => Promise<T>, ctx: ToolCtx = {}) {
  return runTool(label, fn, ctx);
}

export async function resolveEffectiveUnit(params: { conversationKey?: string; agentUnitId?: string | null }) {
  const { conversationKey, agentUnitId } = params;
  let conversationUnitId: string | null = null;
  let conversationUnitName: string | null = null;

  if (conversationKey) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("wa_conversas")
      .select("unidade_id")
      .eq("phone", conversationKey)
      .maybeSingle();

    if (!error && data?.unidade_id) {
      conversationUnitId = data.unidade_id;
    }
  }

  const effectiveUnitId = conversationUnitId || agentUnitId || null;

  if (effectiveUnitId) {
    try {
      const list = await BempService.listSalons();
      const found = list.find((s: any) => String(s?.id) === String(effectiveUnitId));
      if (found?.name || found?.nome) {
        conversationUnitName = String(found.name || found.nome);
      }
    } catch {}
  }

  return {
    effectiveUnitId,
    effectiveUnitName: conversationUnitName,
    source: conversationUnitId ? ("conversation" as const) : ("agent" as const),
    conversationUnitId,
    agentUnitId,
  };
}

export async function patchCustomerContext(
  conversationKey: string | undefined,
  patch: Record<string, unknown>,
) {
  if (!conversationKey) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("wa_conversas")
      .select("customer_context")
      .eq("phone", conversationKey)
      .maybeSingle();
    const current = ((data as any)?.customer_context as Record<string, unknown>) || {};
    const { error } = await supabaseAdmin
      .from("wa_conversas")
      .update({ customer_context: { ...current, ...patch } } as never)
      .eq("phone", conversationKey);
    if (error) console.error(`[chat] context_patch_failed: ${error.message}`);
  } catch (e) {
    console.error("[chat] context_patch_error", e);
  }
}

export function subscriptionContextLine(ctx: Record<string, any>): string {
  const lines = [];
  
  if (ctx?.subscriptionPhoneValidated === true) {
    lines.push(`- Plano validado nesta conversa: SIM (telefone final ${ctx.subscriptionPhoneLast4 || "****"}). Cliente BEMP: ${ctx.bempCustomerId || "n/a"}. Plano: ${ctx.subscriptionPlanName || "n/a"} (${ctx.subscriptionStatus || "status desconhecido"})`);
  } else if (ctx?.subscriptionIntent === true) {
    lines.push("- Plano validado nesta conversa: NÃO — o cliente pediu para usar o plano, então valide o telefone cadastrado antes de aplicar benefícios.");
  }


  if (ctx?.service_id || ctx?.service_name) {
    lines.push(`- Serviço identificado: ${ctx.service_name || ctx.service_id}`);
  }

  if (ctx?.date) {
    lines.push(`- Data identificada: ${ctx.date}`);
  }

  if (ctx?.time) {
    lines.push(`- Horário identificado: ${ctx.time}`);
  }

  if (ctx?.professional_id || ctx?.professional_name) {
    lines.push(`- Profissional identificado: ${ctx.professional_name || ctx.professional_id}`);
  }

  return lines.length > 0 ? lines.join("\n") : "- Nenhum dado adicional conhecido.";
}

export function replacePromptVariables(prompt: string, vars: Record<string, string>) {
  let res = prompt;
  for (const [k, v] of Object.entries(vars)) {
    res = res.replace(new RegExp(`{{${k}}}`, "g"), v || "");
  }
  return res;
}

export function assembleSystemPrompt(opts: {
  contactName?: string | null;
  contactPhone?: string | null;
  unitName?: string | null;
  traceId?: string;
  customer_context?: any;
  activePromotions?: any[];
  bookingContext?: BookingContext | null;
}) {
  const promoBlock = opts.activePromotions?.length
    ? opts.activePromotions.map(p => `- ${p.name}: ${p.description}`).join("\n")
    : "Nenhuma promoção ativa no momento.";

  const summary = subscriptionContextLine(opts.customer_context || {});
  const booking = (opts.bookingContext ?? (opts.customer_context?.bookingContext as BookingContext | undefined)) || {};

  return replacePromptVariables(DEFAULT_SYSTEM_PROMPT, {
    contactName: opts.contactName || "Cliente",
    contactPhone: opts.contactPhone || "Desconhecido",
    unitName: opts.unitName || "Não selecionada",
    traceId: opts.traceId || "n/a",
    booking_context_block: buildBookingContextBlock(booking),
    customer_context_summary: summary,
    active_promotions_block: promoBlock
  });
}

function buildTools(
  sandbox: boolean,
  fallbackAgentUnitId?: string | null,
  conversationKey?: string,
  currentMessageId?: string | null,
  subscriptionIntent?: boolean,
  traceId?: string,
  messages: any[] = []
) {
  const safeToolLocal = <T,>(label: string, fn: () => Promise<T>) =>
    runTool(label, fn, { conversationKey, effectiveUnitId: fallbackAgentUnitId });

  return {
    validate_subscription_phone: tool({
      description:
        "Valida se o cliente possui uma assinatura ativa pesquisando pelo telefone cadastrado. USE SOMENTE se o cliente pediu explicitamente para usar plano/assinatura/benefício.",
      inputSchema: z.object({
        phone_number: z.string().describe("Telefone completo com DDD"),
      }),
      execute: async ({ phone_number }) =>
        safeToolLocal("validate_subscription_phone", async () => {
          if (subscriptionIntent !== true) {
            console.warn("[chat] SUBSCRIPTION_TOOL_BLOCKED: sem intenção explícita do cliente");
            return {
              success: false,
              blocked: true,
              code: "SUBSCRIPTION_INTENT_REQUIRED",
              message:
                "O cliente não pediu para usar plano/assinatura. Não valide assinatura, não peça telefone cadastrado e siga o agendamento normal.",
            };
          }
          const { validateSubscriptionByPhone } = await import("@/lib/bemp/phone-validation.server");
          return validateSubscriptionByPhone(phone_number);
        }),
    }),

    list_units_info: tool({
      description: "Lista as unidades ativas na Bemp.",
      inputSchema: z.object({}),
      execute: async () =>
        safeToolLocal("list_units_info", async () => {
          const arr = await BempService.listSalons();
          return arr.map(s => ({ id: s.id, name: s.name || s.nome, address: s.address || s.endereco }));
        }),
    }),
    list_services: tool({
      description: "Lista serviços de uma unidade. USE SEMPRE para obter preços oficiais antes de responder ao cliente.",
      inputSchema: z.object({ salon_id: z.string().optional() }),
      execute: async ({ salon_id }) =>
        safeToolLocal("list_services", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: salon_id || fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("Unidade não resolvida.");
          
          const services = await BempService.listServices(effectiveUnitId);
          
          // Auditoria e Resolução de Preço para o trace atual
          if (traceId) {
            const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
            const textToSearch = lastUserMessage?.content || "";
            
            // Re-extrair slots com o contexto atual para capturar seleções de ambiguidade
            const { extractBookingSlots } = await import("@/lib/booking/context");
            const extracted = extractBookingSlots(textToSearch, new Date(), bookingContext);
            
            // Se o extrator já resolveu a ambiguidade (serviceId presente e clarificationRequired false)
            if (extracted.serviceId && extracted.clarificationRequired === false) {
              const services = await BempService.listServices(effectiveUnitId);
              const selected = services.find((s: any) => String(s.id) === String(extracted.serviceId));
              if (selected) {
                priceAuditor.set(traceId, {
                  serviceId: String(selected.id),
                  serviceName: selected.name,
                  price: parseFloat(selected.price),
                  unitId: effectiveUnitId,
                  source: "BEMP/clarification_resolved"
                });
                if (conversationKey) {
                  await patchCustomerContext(conversationKey, {
                    'bookingContext.clarificationRequired': false,
                    'bookingContext.candidates': null,
                    'bookingContext.serviceId': String(selected.id),
                    'bookingContext.serviceName': selected.name
                  });
                }
                console.log(`[SERVICE_CLARIFICATION_RESOLVED] traceId=${traceId}, service=${selected.name}`);
                return services;
              }
            }

            // Busca semântica dinâmica no catálogo real
            const searchTerms = String(textToSearch).toLowerCase().split(/\s+/).filter(t => t.length > 2);
            const candidates = services.filter((s: any) => 
               searchTerms.some(term => s.name.toLowerCase().includes(term))
            );

            if (candidates.length > 1) {
              // AMBIGUIDADE DETECTADA: Mais de um serviço plausível
              if (conversationKey) {
                const candidateList = candidates.slice(0, 5).map((c: any) => ({
                  id: String(c.id),
                  name: c.name,
                  price: parseFloat(c.price)
                }));

                await patchCustomerContext(conversationKey, {
                  'bookingContext.clarificationRequired': true,
                  'bookingContext.candidates': candidateList,
                  'bookingContext.serviceId': null,
                  'bookingContext.serviceName': null
                });
                
                console.log(`[SERVICE_CLARIFICATION_REQUIRED] traceId=${traceId}, found=${candidates.length} candidates`);
              }
            } else if (candidates.length === 1) {
              const best = candidates[0];
              priceAuditor.set(traceId, {
                serviceId: String(best.id),
                serviceName: best.name,
                price: parseFloat(best.price),
                unitId: effectiveUnitId,
                source: "BEMP/list_services"
              });

              if (conversationKey) {
                await patchCustomerContext(conversationKey, {
                  'bookingContext.clarificationRequired': false,
                  'bookingContext.candidates': null,
                  'bookingContext.serviceId': String(best.id),
                  'bookingContext.serviceName': best.name
                });
              }
              console.log(`[SERVICE_PRICE_RESOLVED] traceId=${traceId}, service=${best.name}, price=${best.price}`);
            }
          }
          
          return services;
        }),
    }),
    list_professionals: tool({
      description: "Lista profissionais para um serviço.",
      inputSchema: z.object({ salon_id: z.number(), service_id: z.number() }),
      execute: async ({ salon_id, service_id }) =>
        safeToolLocal("list_professionals", async () => BempService.listProfessionals(salon_id, service_id)),
    }),
    list_slots: tool({
      description: "Lista horários disponíveis. Após obter horários, informe-os ao cliente para que ele escolha um.",
      inputSchema: z.object({
        salon_id: z.number(),
        service_id: z.number(),
        date: z.string(),
        professional_id: z.number().optional()
      }),
      execute: async (input) =>
        safeToolLocal("list_slots", async () => {
          const slots = await BempService.listAvailableSlots({
            salonId: input.salon_id,
            serviceId: input.service_id,
            date: input.date,
            professionalId: input.professional_id
          });
          
          // Salvar slots oferecidos no contexto
          if (Array.isArray(slots) && conversationKey) {
            const times = slots.map((s: any) => s.start.split('T')[1].substring(0, 5));
            await patchCustomerContext(conversationKey, {
              'bookingContext.availableSlots': times
            });
          }
          
          return slots;
        }),
    }),
    create_appointment: tool({
      description: "Cria o agendamento real na Bemp somente após confirmação explícita do cliente. Se o bookingContext já estiver confirmado, execute a criação e nunca volte a perguntar serviço, data ou horário.",
      inputSchema: z.object({
        salon_id: z.number(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        start: z.string(),
        end: z.string(),
        name: z.string(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async (input) =>
        safeToolLocal("create_appointment", async () => {
          if (sandbox) return { success: true, sandbox: true, simulated: true, id: `SIM-${Date.now()}` };
          return BempService.createAppointment(input);
        }),
    }),
    list_customer_appointments: tool({
      description: "Busca agendamentos por telefone.",
      inputSchema: z.object({
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async (input) =>
        safeToolLocal("list_customer_appointments", async () => BempService.listCustomerAppointments(input)),
    }),
  };
}

export async function runAgentWithLogging(opts: AgentOptions & { messages?: any[]; text?: string }) {
  // runAgent já aplica o limite de 12 mensagens para segurança global
  return runAgent(opts);
}

export async function isIAConfigured(): Promise<boolean> {
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY;
  return Boolean(gatewayKey && gatewayKey.length > 10);
}

export async function streamAgent(opts: { messages: any[]; sandbox?: boolean }) {
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY || "";
  const provider = createLovableAiGatewayProvider(gatewayKey);
  const model = provider("google/gemini-2.5-flash");
  const modelMessages = await convertToModelMessages(opts.messages);

  return streamText({
    model,
    system: DEFAULT_SYSTEM_PROMPT + (opts.sandbox ? SANDBOX_NOTE : ""),
    messages: modelMessages,
    maxSteps: 5,
  } as any);
}

export async function runAgent(opts: AgentOptions & { messages?: any[]; text?: string }) {
  const { conversationKey, unidadeId, sandbox, customerContext, activePromotions, traceId } = opts;
  // Limite seguro de histórico para evitar recusa silenciosa (Gemini 2.5 Flash)
  // Preserva 12 mensagens mais recentes (aprox. 6 turnos)
  const rawMessages = Array.isArray(opts.messages) ? opts.messages : [];
  const messages = rawMessages.slice(-12);

  const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ conversationKey, agentUnitId: unidadeId });
  
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY || "";
  const provider = createLovableAiGatewayProvider(gatewayKey);
  const model = provider("google/gemini-2.5-flash");

  const bookingContext: BookingContext =
    ((opts as any).bookingContext as BookingContext) ||
    ((customerContext as any)?.bookingContext as BookingContext) ||
    {};

  const systemPrompt = assembleSystemPrompt({
    contactName: opts.contactName,
    contactPhone: opts.contactPhone,
    unitName: effectiveUnitName,
    traceId,
    customer_context: customerContext,
    activePromotions,
    bookingContext
  });

  const modelMessages = await convertToModelMessages(messages);
  const aiStartedAt = Date.now();
  const response = await generateText({
    model,
    system: systemPrompt + (sandbox ? SANDBOX_NOTE : ""),
    messages: modelMessages,
    tools: buildTools(!!sandbox, effectiveUnitId, conversationKey, opts.messageId, bookingContext.subscriptionIntent, traceId, messages),
    maxSteps: 5,
    onStepFinish: async (step: any) => {
      if (traceId) {
        await logEvent({
          instance: opts.instance || "unknown",
          messageId: opts.messageId || "unknown",
          event: "AI_STEP_COMPLETED",
          status: "success",
          payload: { 
            traceId, 
            tokens: step.usage.totalTokens,
            historyMessages: messages.length,
            finishReason: step.finishReason
          }
        }).catch(() => {});
      }
    }
  } as any);

  return {
    text: response.text,
    toolResults: response.toolResults,
    usage: response.usage,
    durationMs: Date.now() - aiStartedAt
  };
}
