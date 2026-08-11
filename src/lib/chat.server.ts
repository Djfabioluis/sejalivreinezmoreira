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
import { EvolutionService } from "./evolution/evolution-service.server";
import {
  BempService,
  extractBempAppointmentId,
} from "@/lib/bemp-service.server";

const PROFESSIONAL_PREFERENCE_NOTE = "com preferência";

export const MANDATORY_SYSTEM_RULES = `REGRAS OBRIGATÓRIAS DO SISTEMA (NUNCA IGNORAR):
- O NOME DO CLIENTE deve ser usado em TODA resposta inicial ou saudação.
- Se "Nome do cliente" estiver preenchido com um nome real (não genericamente "Cliente"), use-o obrigatoriamente: "Olá, {{contactName}}! 💜".
- NUNCA invente nomes. Se o nome for desconhecido ou genérico (como "Cliente"), use apenas "Olá! Tudo bem?".
- JAMAIS exiba ícones de placeholder ou a palavra "Cliente" como se fosse o nome da pessoa.
- ENDEREÇO DA UNIDADE CENTRO: O endereço OBRIGATÓRIO é "Rua Marechal Floriano Peixoto, 45". Nunca invente nem use endereços antigos ou "2º andar".
- UNIDADE OPERACIONAL: A unidade ativa é determinada pelo número de WhatsApp que recebeu a conversa. 
- Se a "Unidade operacional" ({{unitName}}) estiver preenchida, você está PROIBIDA de perguntar qual unidade o cliente deseja. Considere esta a unidade escolhida.
- NÃO ofereça troca de unidade nem pergunte "Centro ou outra unidade?" a menos que o cliente peça explicitamente para mudar.
- NÃO repita perguntas já respondidas. Verifique o bloco "DADOS JÁ CONHECIDOS" e a mensagem atual do cliente antes de perguntar.
- Se o cliente já informou o serviço (mesmo que seja apenas uma intenção como "escova"), NÃO pergunte "Qual serviço deseja realizar?". Avance para data/horário.
- Se o profissional desejado não tiver agenda, informe o cliente e ofereça lista de espera (join_waiting_list).
- Faça apenas uma pergunta por vez.
- Use um tom caloroso, mas profissional. Emojis com moderação.
- Quando a intenção MECHAS for detectada e a promoção PACOTE_MECHAS_MENSAL estiver ativa, você DEVE oferecer obrigatoriamente o "Pacote de Mechas" por "R$ 289,90" antes de qualquer outra coisa.
- Para identificar assinantes, utilize EXCLUSIVAMENTE o telefone cadastrado. NUNCA mencione a palavra "CPF".
- Formate preços como R$ XX,XX.`;

export const DEFAULT_KNOWLEDGE_PROMPT = `Você é a Julia, a secretária virtual humanizada do Salão Seja Livre.
Sua missão é realizar agendamentos e vender planos de assinatura de forma acolhedora, eficiente e natural.

DADOS DO ATENDIMENTO:
Nome do cliente: {{contactName}}
Telefone: {{contactPhone}}
Unidade: {{unitName}}
TraceID: {{traceId}}

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
  } else {
    lines.push("- Plano validado nesta conversa: NÃO — valide o telefone da assinatura antes de prosseguir com benefícios.");
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
}) {
  const promoBlock = opts.activePromotions?.length
    ? opts.activePromotions.map(p => `- ${p.name}: ${p.description}`).join("\n")
    : "Nenhuma promoção ativa no momento.";

  const summary = subscriptionContextLine(opts.customer_context || {});

  return replacePromptVariables(DEFAULT_SYSTEM_PROMPT, {
    contactName: opts.contactName || "Cliente",
    contactPhone: opts.contactPhone || "Desconhecido",
    unitName: opts.unitName || "Não selecionada",
    traceId: opts.traceId || "n/a",
    customer_context_summary: summary,
    active_promotions_block: promoBlock
  });
}

function buildTools(
  sandbox: boolean,
  fallbackAgentUnitId?: string | null,
  conversationKey?: string,
  currentMessageId?: string | null,
) {
  const safeToolLocal = <T,>(label: string, fn: () => Promise<T>) =>
    runTool(label, fn, { conversationKey, effectiveUnitId: fallbackAgentUnitId });

  return {
    validate_subscription_phone: tool({
      description: "Valida se o cliente possui uma assinatura ativa pesquisando pelo telefone cadastrado.",
      inputSchema: z.object({
        phone_number: z.string().describe("Telefone completo com DDD"),
      }),
      execute: async ({ phone_number }) =>
        safeToolLocal("validate_subscription_phone", async () => {
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
      description: "Lista serviços de uma unidade.",
      inputSchema: z.object({ salon_id: z.string().optional() }),
      execute: async ({ salon_id }) =>
        safeToolLocal("list_services", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: salon_id || fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("Unidade não resolvida.");
          return BempService.listServices(effectiveUnitId);
        }),
    }),
    list_professionals: tool({
      description: "Lista profissionais para um serviço.",
      inputSchema: z.object({ salon_id: z.number(), service_id: z.number() }),
      execute: async ({ salon_id, service_id }) =>
        safeToolLocal("list_professionals", async () => BempService.listProfessionals(salon_id, service_id)),
    }),
    list_slots: tool({
      description: "Lista horários disponíveis.",
      inputSchema: z.object({
        salon_id: z.number(),
        service_id: z.number(),
        date: z.string(),
        professional_id: z.number().optional()
      }),
      execute: async (input) =>
        safeToolLocal("list_slots", async () => BempService.listAvailableSlots({
          salonId: input.salon_id,
          serviceId: input.service_id,
          date: input.date,
          professionalId: input.professional_id
        })),
    }),
    create_appointment: tool({
      description: "Cria um agendamento na Bemp.",
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

export async function runAgent(opts: AgentOptions & { messages?: any[]; text?: string }) {
  const { conversationKey, unidadeId, sandbox, customerContext, activePromotions } = opts;
  // Resiliência: se não vier histórico, monta a partir do texto recebido.
  const messages =
    Array.isArray(opts.messages) && opts.messages.length > 0
      ? opts.messages
      : [{ role: "user", parts: [{ type: "text", text: opts.text ?? "" }] }];

  const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ conversationKey, agentUnitId: unidadeId });
  
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY || "";
  const provider = createLovableAiGatewayProvider(gatewayKey);
  const modelName = "google/gemini-2.5-flash";
  const model = provider(modelName);

  if (opts.traceId) {
    await logEvent({
      instance: opts.instance || "unknown",
      messageId: opts.messageId || "unknown",
      event: "AI_PROVIDER_RESOLVED",
      status: "success",
      payload: { 
        traceId: opts.traceId, 
        provider: "lovable-gateway", 
        model: modelName,
        apiKeyStatus: gatewayKey ? "OK" : "MISSING"
      }
    });
  }

  const system = assembleSystemPrompt({
    contactName: opts.contactName,
    contactPhone: opts.contactPhone,
    unitName: effectiveUnitName,
    traceId: opts.traceId,
    customer_context: customerContext,
    activePromotions: activePromotions
  });

  const tools = buildTools(!!sandbox, effectiveUnitId, conversationKey, opts.messageId);

  // Aceita tanto UIMessages (com parts) quanto ModelMessages (com content).
  const needsConversion = messages.some((m: any) => Array.isArray(m?.parts));
  const modelMessages = needsConversion
    ? await convertToModelMessages(messages as any)
    : messages;

  try {
    return await generateText({
      model: model as any,
      system: system + (sandbox ? SANDBOX_NOTE : ""),
      messages: modelMessages,
      tools: tools as any,
      maxSteps: 5,
    } as any);
  } catch (error: any) {
    if (opts.traceId) {
      await logEvent({
        instance: opts.instance || "unknown",
        messageId: opts.messageId || "unknown",
        event: "AI_REQUEST_FAILED",
        status: "error",
        errorDetail: error.message,
        payload: {
          traceId: opts.traceId,
          errorName: error.name,
          errorStack: error.stack,
          httpStatus: error.status,
          model: modelName
        }
      });
    }
    throw error;
  }
}

export async function runAgentWithLogging(opts: AgentOptions & { messages?: any[]; text?: string }) {
  const result = await runAgent(opts);

  // Garantia determinística da promoção de mechas (Bug 2)
  const last = Array.isArray(opts.messages) ? opts.messages[opts.messages.length - 1] : null;
  const lastMessage =
    (typeof last?.content === "string" ? last.content : null) ??
    (Array.isArray(last?.parts) ? last.parts.map((p: any) => p?.text ?? "").join(" ") : "") ??
    "";
  const isMechasIntent = /\bmechas?\b/i.test(`${lastMessage} ${opts.text ?? ""}`);

  if (isMechasIntent && result.text) {
      const promoText = "Pacote de Mechas por R$ 289,90";
      // Reduzir repetição: só injeta se não houver menção no histórico recente ou na própria resposta
      const historyHasPromo = opts.messages?.some((m: any) => {
        const text = typeof m.content === 'string' ? m.content : (Array.isArray(m.parts) ? m.parts.map((p: any) => p.text).join(' ') : '');
        return text.includes("289,90");
      });

      if (!result.text.includes("289,90") && !historyHasPromo) {
          console.log("[chat] forced_promotion_injection: mechas");
          return {
            ...result,
            text: `Entendi! 💜 E já te adianto que estamos com uma promoção imperdível: *${promoText}*! \n\n${result.text}`
          };
      }
  }

  return result;
}

export async function streamAgent(opts: AgentOptions & { messages: any[] }) {
  const { messages, conversationKey, unidadeId, sandbox, customerContext, activePromotions } = opts;
  const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ conversationKey, agentUnitId: unidadeId });
  
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY || "";
  const provider = createLovableAiGatewayProvider(gatewayKey);
  const model = provider("google/gemini-2.5-flash");

  const system = assembleSystemPrompt({
    contactName: opts.contactName,
    contactPhone: opts.contactPhone,
    unitName: effectiveUnitName,
    traceId: opts.traceId,
    customer_context: customerContext,
    activePromotions: activePromotions
  });

  const tools = buildTools(!!sandbox, effectiveUnitId, conversationKey, opts.messageId);

  const modelMessages = await convertToModelMessages(messages);
  return streamText({
    model: model as any,
    system: system + (sandbox ? SANDBOX_NOTE : ""),
    messages: modelMessages,
    tools: tools as any,
    maxSteps: 5,
  } as any);
}
