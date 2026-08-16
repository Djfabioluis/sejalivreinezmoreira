// Server-only. Shared AI-agent runner for /api/chat (web) and /api/public/whatsapp.
import { convertToModelMessages, streamText, generateText, tool, type UIMessage } from "ai";
import { type AgentOptions } from "./agent-types";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { logEvent } from "./evolution/logger.server";
import { classifyFailure, describeError } from "./evolution/failure";
import { inferStageFromTool, updateCustomerPipeline } from "@/lib/crm.server";
import { normalizeServiceSearchText } from "./service-utils";
import {
  buildBookingContextBlock,
  type BookingContext,
} from "@/lib/booking/context";

import { BempService } from "@/lib/bemp-service.server";
import { priceAuditor } from "./booking/price-auditor.server";
import { validateOutputAgainstCatalog } from "./booking/catalog-auditor.server";

export { normalizeServiceSearchText };

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

${DEFAULT_KNOWLEDGE_PROMPT}

- NORMALIZAÇÃO SEMÂNTICA "MÃO": Se o cliente usar termos como "mão", "fazer a mão" ou "unhas da mão", considere SEMPRE como intenção direta de MANICURE. Você está PROIBIDA de perguntar se o cliente quis dizer manicure ou pedir confirmação semântica para este termo.
- REGRA ABSOLUTA — CATÁLOGO BEMP É A FONTE DA VERDADE: Você está PROIBIDA de inventar, completar, renomear ou sugerir nomes de serviços que não estejam EXATAMENTE como retornados no contexto de agendamento. 
- CATALOG_ONLY MODE ATIVO: Toda opção de serviço que você apresentar DEVE ter um serviceId correspondente no catálogo real fornecido. Se houver múltiplos candidatos (campo 'candidates' no contexto), apresente-os EXATAMENTE como escritos na lista de candidatos e peça para o cliente escolher apenas um deles. VOCÊ NÃO PODE ADICIONAR OPÇÕES, EXEMPLOS OU ALTERNATIVAS QUE NÃO ESTEJAM NA LISTA DE CANDIDATOS.
- SE O SERVICE ID E UNIT ID ESTIVEREM PRESENTES NO CONTEXTO E O CLIENTE INFORMAR UMA DATA, VOCÊ DEVE OBRIGATORIAMENTE CHAMAR 'list_slots'.
- SE HOUVER 'candidates' NO CONTEXTO, APRESENTE AS OPÇÕES IMEDIATAMENTE. NÃO PERGUNTE A DATA SE ELA JÁ ESTIVER NO CONTEXTO (ex: hoje).
- SE O CLIENTE JÁ INFORMOU A DATA (ex: "hoje"), ELA APARECERÁ NO CONTEXTO. NÃO PERGUNTE A DATA NOVAMENTE.`;

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
            phone: ctx.conversationKey.split(':')[1] || ctx.conversationKey,
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
          } as any).eq("phone", ctx.conversationKey.split(':')[1] || ctx.conversationKey);
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
      conversationUnitId = String(data.unidade_id);
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
    await supabaseAdmin
      .from("wa_conversas")
      .update({ customer_context: { ...current, ...patch } } as never)
      .eq("phone", conversationKey);
  } catch (e) {
    console.error("[chat] context_patch_error", e);
  }
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

  const summary = `- Status atual: ${opts.bookingContext?.clarificationRequired ? "AGUARDANDO CLARIFICAÇÃO DE SERVIÇO" : "NORMAL"}`;
  const booking = opts.bookingContext || {};

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
  subscriptionIntent?: boolean,
  traceId?: string,
  bookingContext: BookingContext | null = null
) {
  const safeToolLocal = <T,>(label: string, fn: () => Promise<T>) =>
    runTool(label, fn, { conversationKey, effectiveUnitId: fallbackAgentUnitId });

  return {
    list_services: tool({
      description: "Lista serviços de uma unidade. USE SEMPRE para obter preços oficiais.",
      inputSchema: z.object({ salon_id: z.string().optional() }),
      execute: async ({ salon_id }) =>
        safeToolLocal("list_services", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: salon_id || fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("Unidade não resolvida.");
          const services = await BempService.listServices(effectiveUnitId);
          return services.map(s => ({
            id: String(s.id),
            name: s.name || s.nome,
            price: s.price || s.valor || 0,
            category: s.category || s.categoria
          }));
        }),
    }),
    list_slots: tool({
      description: "Lista horários disponíveis. OBRIGATÓRIO chamar quando tiver salon_id, service_id e date.",
      inputSchema: z.object({
        salon_id: z.string(),
        service_id: z.string(),
        date: z.string(),
        professional_id: z.string().optional()
      }),
      execute: async (input) =>
        safeToolLocal("list_slots", async () => {
          return BempService.listAvailableSlots({
            salonId: input.salon_id,
            serviceId: input.service_id,
            date: input.date,
            professionalId: input.professional_id
          });
        }),
    }),
    create_appointment: tool({
      description: "Cria o agendamento real na Bemp.",
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
  };
}

export async function runAgentWithLogging(opts: AgentOptions & { messages?: any[]; text?: string }) {
  return runAgent(opts);
}

export async function isIAConfigured(): Promise<boolean> {
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY;
  return Boolean(gatewayKey && gatewayKey.length > 10);
}

export async function streamAgent(opts: { messages: any[]; sandbox?: boolean }) {
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY || "";
  const provider = createLovableAiGatewayProvider(gatewayKey);
  const model = provider("google/gemini-2.0-flash-exp");

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
  const rawMessages = Array.isArray(opts.messages) ? opts.messages : [];
  const messages = rawMessages.slice(-12);
  const text = opts.text || (messages[messages.length - 1]?.content as string) || "";

  const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ conversationKey, agentUnitId: unidadeId });
  
  const gatewayKey = process.env.LOVABLE_AI_GATEWAY_KEY || process.env.LOVABLE_API_KEY || "";
  const provider = createLovableAiGatewayProvider(gatewayKey);
  const model = provider("google/gemini-1.5-flash");

  let bookingContext: BookingContext =
    ((opts as any).bookingContext as BookingContext) ||
    ((customerContext as any)?.bookingContext as BookingContext) ||
    {};

  // 1. RESOLUÇÃO DETERMINÍSTICA (BACKEND)
  const { extractBookingSlots, mergeBookingContext } = await import("@/lib/booking/context");
  const extracted = extractBookingSlots(text, new Date(), bookingContext);
  bookingContext = mergeBookingContext(bookingContext, extracted);

  // Se houver intenção de serviço sem ID, resolver deterministicamente
  if (effectiveUnitId && bookingContext.serviceText && !bookingContext.serviceId && !bookingContext.clarificationRequired) {
    const services = await BempService.listServices(effectiveUnitId);
    const normalizedSearch = normalizeServiceSearchText(bookingContext.serviceText);
    const logCtx = { traceId, unitId: effectiveUnitId, serviceText: bookingContext.serviceText, normalizedSearch };

    const matches = services.filter(s => {
      const name = normalizeServiceSearchText(s.name || s.nome || "");
      // Prioridade 1: Match exato após normalização
      if (name === normalizedSearch) return true;
      // Prioridade 2: Search contido no nome (ex: "manicure" em "Manicure + Pedicure")
      if (name.includes(normalizedSearch)) return true;
      // Prioridade 3: Nome contido no search (ex: "unha" em "quero fazer minha unha")
      if (normalizedSearch.includes(name) && name.length > 3) return true;
      return false;
    });

    await logEvent({
      instance: conversationKey?.split(':')[0] || 'unknown',
      event: 'BEMP_SERVICE_LOOKUP_COMPLETED',
      status: 'success',
      payload: { 
        foundCount: matches.length,
        candidates: matches.slice(0, 3).map(m => m.name || m.nome),
        search: normalizedSearch
      }
    });

    if (matches.length === 1) {
      bookingContext.serviceId = String(matches[0].id);
      bookingContext.serviceName = matches[0].name || matches[0].nome;
      if (conversationKey) {
        await patchCustomerContext(conversationKey, {
          'bookingContext.serviceId': bookingContext.serviceId,
          'bookingContext.serviceName': bookingContext.serviceName,
          'bookingContext.serviceText': null,
          'bookingContext.clarificationRequired': false
        });
      }
    } else if (matches.length > 1) {
      const candidateList = matches.map(m => ({
        id: String(m.id),
        name: m.name || m.nome,
        price: m.price || m.valor || 0
      }));
      bookingContext.clarificationRequired = true;
      bookingContext.candidates = candidateList;
      if (conversationKey) {
        await patchCustomerContext(conversationKey, {
          'bookingContext.clarificationRequired': true,
          'bookingContext.candidates': candidateList,
          'bookingContext.serviceId': null,
          'bookingContext.serviceName': null
        });
      }
    }
  }

  // 2. LLM EXECUTION
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
  
  const result = await generateText({
    model,
    system: systemPrompt + (sandbox ? SANDBOX_NOTE : ""),
    messages: modelMessages,
    tools: buildTools(!!sandbox, effectiveUnitId, conversationKey, bookingContext.subscriptionIntent, traceId, bookingContext),
    maxSteps: 5,
  } as any);

  let finalResponse = result.text;

  // 3. CATALOG OUTPUT VALIDATION (BLOQUEIO DE ALUCINAÇÕES)
  if (bookingContext.clarificationRequired && bookingContext.candidates?.length) {
    const { validateOutputAgainstCatalog } = await import("./booking/catalog-auditor.server");
    const validation = validateOutputAgainstCatalog(finalResponse, bookingContext.candidates, bookingContext);
    if (validation.blocked) {
      finalResponse = validation.text;
    }
  }

  // 4. EVOLUTION DELIVERY & PERSISTENCE
  if (conversationKey && finalResponse) {
    const { EvolutionService } = await import("./evolution/evolution-service.server");
    const { persistWaMessage } = await import("@/lib/booking/persistence-helper.server");
    const [instanceId, remoteJid] = conversationKey.split(":");
    
    if (finalResponse.trim()) {
      // 4.1 Enviar para WhatsApp
      await EvolutionService.sendText({
        instance: instanceId,
        to: remoteJid,
        text: finalResponse,
        module: "julia-ai"
      });

      // 4.2 Persistir Histórico via RPC Real (p_new_message, p_phone)
      await persistWaMessage(conversationKey, {
        role: "assistant",
        content: finalResponse,
        timestamp: new Date().toISOString(),
        bookingContext, // Preserva o contexto determinístico no histórico
        traceId
      });
    }
  }

  return { text: finalResponse, bookingContext };
}
