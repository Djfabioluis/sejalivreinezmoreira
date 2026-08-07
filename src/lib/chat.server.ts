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
import { PromotionService, type Promotion } from "./promotion-service.server";


import {
  bempFetch,
  getBempConfig,
  BEMP_WEBHOOK_BASE,
  PROFESSIONAL_PREFERENCE_NOTE,
  extractBempAppointmentId,
  tryUpdateBempScheduleNote,
  withProfessionalPreferenceNote,
} from "@/lib/bemp.server";

export const MANDATORY_SYSTEM_RULES = `REGRAS OBRIGATÓRIAS DO SISTEMA (NUNCA IGNORAR):
- Se "Nome do cliente" estiver preenchido, NUNCA pergunte o nome.
- Se "Unidade operacional" estiver preenchida, NUNCA pergunte qual unidade o cliente deseja.
- NUNCA ofereça troca de unidade nem interprete menção a outras unidades como mudança operacional.
- NÃO reinicie o atendimento a cada mensagem.
- NÃO repita perguntas já respondidas.
- Se o profissional desejado não tiver agenda, informe o cliente e ofereça lista de espera (join_waiting_list).
- Faça apenas uma pergunta por vez.
- Use um tom caloroso, mas profissional. Emojis com moderação.
- Quando a intenção MECHAS for detectada e o backend fornecer a promoção PACOTE_MECHAS_MENSAL como ativa, informe obrigatoriamente o nome e o preço promocional antes de solicitar profissional ou horário. Exemplo: "Neste mês temos nosso Pacote de Mechas em promoção por apenas R$ 289,90."
- Se a promoção PACOTE_MECHAS_MENSAL estiver no bloco de PROMOÇÕES ATIVAS, ela DEVE ser citada na resposta se o assunto for cabelos ou mechas.
- Para identificadores de assinaturas, utilize EXCLUSIVAMENTE o telefone cadastrado. NUNCA mencione a palavra "CPF" ou solicite qualquer documento de identificação nacional. Se precisar localizar um plano, peça o telefone com DDD. Se o cliente enviar o CPF espontaneamente, ignore-o e peça o telefone.
- Formate preços como R$ XX,XX.
- Promoção do mês: Planos de assinatura SEM TAXA DE ADESÃO.
- Restrição: Unidade Centro Cívico não aceita planos de assinatura.`;

export const DEFAULT_KNOWLEDGE_PROMPT = `Você é a Julia, a secretária virtual humanizada do Salão Seja Livre.
Sua missão é realizar agendamentos e vender planos de assinatura de forma acolhedora, eficiente e natural.

DADOS DO ATENDIMENTO:
Nome do cliente: {{contactName}}
Telefone: {{contactPhone}}
Unidade: {{unitName}}
TraceID: {{traceId}}

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

type ToolCtx = { conversationKey?: string; effectiveUnitId?: string | null };

/**
 * Executa uma tool com logs estruturados (tool_started / tool_completed / tool_failed).
 * Nunca propaga exceção: devolve retorno estruturado { success:false, code, message }.
 */
/**
 * Executa uma tool com logs estruturados e classificação de erro rigorosa.
 */
function runTool<T>(label: string, fn: () => Promise<T>, ctx: ToolCtx = {}) {
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

      // Log estruturado para diagnóstico real
      console.error(
        `[chat] tool_failed: ${base}, durationMs=${durationMs}, code=${failure.code}, integration=${failure.code.startsWith('bemp') ? 'BEMP' : 'INTERNAL'}, statusCode=${info.status}, message=${info.message}`
      );

      // Se for um erro crítico/inesperado, aciona handoff humano
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

function safeTool<T>(label: string, fn: () => Promise<T>, ctx: ToolCtx = {}) {
  return runTool(label, fn, ctx);
}


async function resolveEffectiveUnit(params: { conversationKey?: string; agentUnitId?: string | null }) {
  const { conversationKey, agentUnitId } = params;
  let conversationUnitId: string | null = null;
  let conversationUnitName: string | null = null;

  if (conversationKey && !conversationKey.includes(":")) {
    console.warn(`[chat] resolveEffectiveUnit: invalid_conversation_key received (pure phone instead of instance:phone): ${conversationKey}`);
  }

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

  // Se a unidade foi resolvida, tentamos pegar o nome dela para manter o contexto consistente
  if (effectiveUnitId) {
    try {
      const cfg = await getBempConfig();
      const salons = (await bempFetch(`${cfg.apiBase}/salons`)) as any;
      const list = Array.isArray(salons) ? salons : (salons?.data ?? salons?.salons ?? []);
      const found = list.find((s: any) => String(s?.id) === String(effectiveUnitId));
      if (found?.name || found?.nome) {
        conversationUnitName = String(found.name || found.nome);
      }
    } catch {}
  }

  console.log(`[chat] chat_orchestrator_loaded: modulePath=@/lib/chat.server, promptVersion=1.3.0-phone-priority, subscriptionLookupMethod=PHONE_ONLY`);
  console.log(`[chat] effective_unit_resolved: unitSource=${conversationUnitId ? "conversation" : "agent"}, conversationKeyAvailable=${!!conversationKey}, effectiveUnitId=${effectiveUnitId}`);

  return {
    effectiveUnitId,
    effectiveUnitName: conversationUnitName,
    source: conversationUnitId ? ("conversation" as const) : ("agent" as const),
    conversationUnitId,
    agentUnitId,
  };
}

/** Mescla campos no customer_context da conversa (no-op se não houver conversationKey). */
async function patchCustomerContext(
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

/**
 * Estado do atendimento para o prompt.
 */
/**
 * Linha de estado da assinatura para o prompt.
 */
export function subscriptionContextLine(ctx: Record<string, any>): string {
  if (ctx?.subscriptionPhoneValidated === true) {
    return `- Plano validado nesta conversa: SIM (telefone final ${ctx.subscriptionPhoneLast4 || "****"}). Cliente BEMP: ${ctx.bempCustomerId || "n/a"}. Plano: ${ctx.subscriptionPlanName || "n/a"} (${ctx.subscriptionStatus || "status desconhecido"})`;
  }
  return "- Plano validado nesta conversa: NÃO — valide o telefone da assinatura antes de prosseguir com benefícios.";
}



async function resolveServiceForEffectiveUnit(params: { serviceName: string; effectiveUnitId: string }) {
  console.log(`[chat] service_resolution_started: serviceName="${params.serviceName}", unitId=${params.effectiveUnitId}`);
  const cfg = await getBempConfig();
  const services = (await bempFetch(`${cfg.apiBase}/salons/${params.effectiveUnitId}/services`)) as any[];
  const list = Array.isArray(services) ? services : (services as any)?.data ?? (services as any)?.services ?? [];
  
  const normalize = (s: string) => 
    s.toLowerCase()
     .trim()
     .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
     .replace(/\s+/g, " "); // remove espaços duplicados

  const target = normalize(params.serviceName);
  
  // 1. Busca por nome exato
  let found = list.find((s: any) => 
    normalize(s?.name || s?.nome || "") === target
  );

  // 2. Se não achou exato, busca por correspondência parcial (o alvo está contido no nome do serviço)
  if (!found) {
    const matches = list.filter((s: any) => {
      const name = normalize(s?.name || s?.nome || "");
      return name.includes(target) || target.includes(name);
    });
    
    // Só seleciona se for único e inequívoco
    if (matches.length === 1) {
      found = matches[0];
    }
  }
  
  if (found) {
    console.log(`[chat] service_resolved_for_unit: serviceId=${found.id}, name="${found.name || found.nome}"`);
  } else {
    console.warn(`[chat] service_not_available_in_unit: serviceName="${params.serviceName}" not found in unit ${params.effectiveUnitId}`);
  }

  return found || null;
}

function buildTools(
  sandbox: boolean,
  fallbackAgentUnitId?: string | null,
  conversationKey?: string,
  currentMessageId?: string | null,
) {
  // Sombreia o helper do módulo injetando o contexto da conversa em todos os logs de tool.
  const safeTool = <T,>(label: string, fn: () => Promise<T>) =>
    runTool(label, fn, { conversationKey, effectiveUnitId: fallbackAgentUnitId });
  const base: Record<string, any> = {

    transfer_conversation_unit: tool({
      description:
        "Transfere REALMENTE a conversa para outra unidade operacional. Use somente APÓS o cliente confirmar claramente que deseja ser atendido em outra unidade (ex.: após ele dizer 'Sim' para a sua pergunta de confirmação). Não use para simples perguntas informativas.",
      inputSchema: z.object({
        target_unit_id: z.string().describe("O ID da unidade de destino"),
        reason: z.string().optional().describe("Motivo da transferência"),
        confirmed: z.boolean().describe("Deve ser true se o cliente confirmou explicitamente"),
      }),
      execute: async ({ target_unit_id, reason, confirmed }) =>
        safeTool("transfer_conversation_unit", async () => {
          if (!conversationKey) throw new Error("Chave da conversa não fornecida para transferência.");
          if (!confirmed) {
             if (reason?.toLowerCase().includes("preço") || reason?.toLowerCase().includes("caro")) {
                return { success: false, abandon_trigger: "PRICE", message: "Entendo perfeitamente. Se mudar de ideia ou precisar de outro serviço, estarei aqui! 😊" };
             }
             return { success: false, message: "Transferência não confirmada pelo cliente." };
          }
          
          console.log(`[transfer] transfer_started for ${conversationKey} to ${target_unit_id}`);
          
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: conv, error: convError } = await supabaseAdmin
            .from("wa_conversas" as never)
            .select("phone, unidade_id, customer_context")
            .eq("phone", conversationKey)
            .maybeSingle();

          if (convError || !conv) {
             console.error(`[transfer] conversation_not_found for ${conversationKey}`);
             return { success: false, code: "conversation_not_found", message: "Não foi possível localizar a conversa." };
          }

          const { data, error } = await supabaseAdmin.rpc("transfer_conversation_unit", {
            p_conversation_phone: conversationKey,
            p_target_unit_id: target_unit_id,
            p_reason: reason || "Solicitado pelo cliente via IA",
          });
          
          if (error) {
            console.error(`[transfer] transfer_failed for ${conversationKey}:`, error.message);
            return { success: false, code: "transfer_failed", message: error.message };
          }

          console.log(`[transfer] transfer_completed and context_reset at database level for ${conversationKey}`);

          // Plano: preserva o nome do plano, mas descarta o service_id da unidade anterior.
          const previousContext = ((conv as any).customer_context ?? {}) as Record<string, unknown>;
          if (previousContext.subscriptionPlanName) {
            await patchCustomerContext(conversationKey, {
              subscriptionPlanName: previousContext.subscriptionPlanName,
              subscriptionPlanId: previousContext.subscriptionPlanId ?? null,
              subscriptionServiceId: null,
              subscriptionServiceName: null,
              subscriptionUnitId: target_unit_id,
            });
            console.log("[bemp-plan] subscription_service_reset_after_transfer");
          }

          // Descartar atribuições em cache da unidade anterior e da nova unidade.
          try {
            const { invalidateAssignmentsCache } = await import("@/lib/bemp/assignments.server");
            if ((conv as any).unidade_id) invalidateAssignmentsCache((conv as any).unidade_id);
            invalidateAssignmentsCache(target_unit_id);
            console.log(`[transfer] assignments_cache_invalidated: unit=${target_unit_id}`);
          } catch (e) {
            console.error("[transfer] cache_invalidation_failed", e);
          }

          
          // Buscar nome da nova unidade
          let newUnitName = `Unidade ${target_unit_id}`;
          try {
            const cfg = await getBempConfig();
            const salons = (await bempFetch(`${cfg.apiBase}/salons`)) as any;
            const list = Array.isArray(salons) ? salons : (salons?.data ?? salons?.salons ?? []);
            const found = list.find((s: any) => String(s?.id) === String(target_unit_id));
            if (found?.name || found?.nome) {
              newUnitName = String(found.name || found.nome);
              // Como a transferência já limpou o contexto no RPC, aqui apenas adicionamos o nome da nova unidade se necessário para a UI/IA
              await patchCustomerContext(conversationKey, { currentUnitName: newUnitName });
            }
          } catch {}

          return { 
            success: true, 
            message: `Pronto! Seu atendimento foi transferido para *${newUnitName}*. Agora vou consultar o serviço nessa unidade. 😊`,
            old_unit_id: (conv as any).unidade_id, 
            new_unit_id: target_unit_id,
            new_unit_name: newUnitName,
            context_reset: true
          };
        }),
    }),
    list_units_info: tool({
      description:
        "Use quando o cliente perguntar quantas unidades existem, quais são as unidades/lojas/endereços. Retorna as unidades ativas na Bemp com endereço. NÃO use para trocar a unidade do agendamento automaticamente.",
      inputSchema: z.object({}),
      execute: async () =>
        safeTool("list_units_info", async () => {
          const cfg = await getBempConfig();
          const raw: any = await bempFetch(`${cfg.apiBase}/salons`);
          const arr: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.salons ?? []);
          const active = arr.filter((s) => {
            const flag = s?.active ?? s?.ativo ?? s?.is_active ?? s?.status;
            if (flag === undefined || flag === null) return true;
            if (typeof flag === "string") return !/inativ|disabled|false|0/i.test(flag);
            return Boolean(flag);
          });
          const units = active.map((s) => {
            const addr =
              s?.address ??
              s?.endereco ??
              [s?.street ?? s?.logradouro, s?.number ?? s?.numero, s?.neighborhood ?? s?.bairro, s?.city ?? s?.cidade, s?.state ?? s?.uf]
                .filter(Boolean)
                .join(", ");
            return {
              id: String(s?.id),
              nome: s?.name ?? s?.nome ?? s?.title,
              endereco: typeof addr === "string" ? addr : JSON.stringify(addr),
            };
          });
          return { total: units.length, unidades: units };
        }),
    }),
    list_salons: tool({
      description: "Lista todas as unidades (salões) disponíveis na conta Bemp.",
      inputSchema: z.object({}),
      execute: async () =>
        safeTool("list_salons", async () => {
          const cfg = await getBempConfig();
          return await bempFetch(`${cfg.apiBase}/salons`);
        }),
    }),


    search_services: tool({
      description:
        "Busca serviços disponíveis na unidade por nome ou categoria (ex: MECHAS). Retorna uma lista de opções reais do BEMP. Use quando o cliente perguntar genericamente por um tipo de serviço ou serviço específico.",
      inputSchema: z.object({
        query: z.string().describe("Termo de busca (ex: 'mechas', 'corte', 'pacote mechas')"),
        category: z.enum(["MECHAS"]).optional().describe("Categoria técnica de serviço (ex: MECHAS)"),
      }),
      execute: async ({ query, category }) =>
        safeTool("search_services", async () => {
          const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");

          const { BempService } = await import("@/lib/bemp-service.server");
          
          // Se for mechas, força a categoria conforme requisito 9
          let searchCategory = category;
          const normalized = normalizeServiceSearchText(query);
          if (SERVICE_CATEGORY_ALIASES.MECHAS.some(alias => normalized.includes(normalizeServiceSearchText(alias)))) {
            searchCategory = "MECHAS";
          }

          if (searchCategory) {
            const result = await BempService.searchServicesByCategory({
              effectiveUnitId,
              category: searchCategory,
              query
            });

            if (result.success && result.data) {
              // Buscar promoções reais do banco
              const activePromos = await PromotionService.getActivePromotions({
                unitId: String(effectiveUnitId),
                channel: "WHATSAPP",
              });
              
              const activePromotions = activePromos.success ? activePromos.promotions : [];

              // Resolver serviços das promoções
              const promosWithService = await Promise.all(activePromotions.map(async (p: any) => {
                const service = await PromotionService.resolvePromotionService(p, String(effectiveUnitId));
                return service ? { ...p, serviceId: service.id } : null;
              }));

              const validPromos = promosWithService.filter((p): p is any => p !== null);

              // Contexto da conversa
              await patchCustomerContext(conversationKey, {
                requestedServiceCategory: searchCategory,
                serviceSearchQuery: query,
                matchingServices: result.data.slice(0, 10).map(s => ({ id: s.id, name: s.name, unitId: effectiveUnitId })),
                activePromotions: validPromos
              });

              return {
                success: true,
                unitName: effectiveUnitName || String(effectiveUnitId),
                category: searchCategory,
                services: result.data,
                promotions: validPromos.map(p => ({
                  code: p?.code,
                  title: p?.title,
                  price: p?.promotional_price,
                  message: `✨ Temos uma ótima notícia! O nosso *${p?.title}* está em promoção por apenas *R$ ${p?.promotional_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*. 💜`
                }))
              };
            }
            return result;
          }

          // Fallback para busca genérica se não for categoria específica
          const { getAvailableServiceAssignments } = await import("@/lib/bemp/assignments.server");
          const allServices = await getAvailableServiceAssignments(effectiveUnitId);
          const filtered = allServices.filter(s => normalizeServiceSearchText(s.name).includes(normalized));
          
          return { success: true, unitId: effectiveUnitId, services: filtered };
        }),
    }),
    list_services: tool({

      description:
        "Lista SOMENTE os serviços que possuem ao menos um profissional atribuído na unidade efetiva (fonte: BEMP). Nunca apresente serviços fora deste retorno.",
      inputSchema: z.object({ salon_id: z.number().optional() }),
      execute: async () =>
        safeTool("list_services", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");
          console.log(`[chat] effective_unit_for_assignments: ${effectiveUnitId}`);
          const { getAvailableServiceAssignments } = await import("@/lib/bemp/assignments.server");
          const services = await getAvailableServiceAssignments(effectiveUnitId);
          if (services.length === 0) {
            console.warn(`[chat] no_assigned_services: unit=${effectiveUnitId}`);
            return {
              success: false,
              code: "no_assigned_services",
              message: "Não há serviços com profissionais atribuídos nessa unidade.",
            };
          }
          return { success: true, unitId: effectiveUnitId, services };
        }),
    }),
    list_professionals: tool({
      description:
        "Lista SOMENTE os profissionais realmente atribuídos ao serviço na unidade efetiva (fonte: BEMP). Informe o nome do serviço.",
      inputSchema: z.object({
        service_name: z.string().describe("Nome do serviço para o qual deseja listar profissionais"),
        service_id: z.number().optional().describe("Ignorado — resolvido dinamicamente"),
        salon_id: z.number().optional().describe("Ignorado — resolvido dinamicamente"),
      }),
      execute: async ({ service_name }) =>
        safeTool("list_professionals", async () => {
          const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) return { success: false, code: "unit_not_resolved", message: "Não foi possível identificar a unidade correta." };
          console.log(`[chat] effective_unit_for_assignments: ${effectiveUnitId}`);
          
          const { resolveServiceAssignment, getProfessionalsForService, computeProfessionalSelection } =
            await import("@/lib/bemp/assignments.server");
          
          const resolution = await resolveServiceAssignment(effectiveUnitId, service_name);
          if (!resolution.success) {
            return {
               success: false,
               code: resolution.code,
               message: resolution.code === "service_ambiguous" 
                 ? `Encontrei mais de um serviço para "${service_name}". Qual destes você prefere?`
                 : `Não encontrei o serviço "${service_name}" na unidade ${effectiveUnitName || effectiveUnitId}.`,
               options: (resolution as any).options
            };
          }

          const service = resolution.service!;
          const allPros = await getProfessionalsForService(effectiveUnitId, service.id);
          const selection = computeProfessionalSelection(allPros);
          const {
            professionals,
            professionalsCount,
            autoSelectProfessional,
            autoSelect,
            askPreference,
            includeNoPreference,
            selectedProfessional,
          } = selection;

          if (professionalsCount === 0) {
            return {
              success: true, // success true pois a busca ocorreu, mas retornamos erro estruturado
              code: "no_assigned_professionals",
              professionals: [],
              professionalsCount: 0,
              autoSelectProfessional: false,
              autoSelect: false,
              askPreference: false,
              includeNoPreference: false,
              selectedProfessional: null,
              message: `Nenhum profissional está atribuído a "${service.name}" nesta unidade.`,
            };
          }

          if (selectedProfessional) {
            await patchCustomerContext(conversationKey, {
              serviceId: service.id,
              requestedService: service.name,
              professionalId: selectedProfessional.id,
              professionalName: selectedProfessional.name,
              preferredProfessional: selectedProfessional.name,
              selectedProfessional: selectedProfessional
            });
            console.log(
              `[chat] single_professional_auto_selected: unit=${effectiveUnitId}, service=${service.id}, professional=${selectedProfessional.id}`,
            );
          }

          return {
            success: true,
            effectiveUnitId,
            effectiveUnitName,
            service: { id: service.id, name: service.name },
            professionals,
            professionalsCount,
            autoSelectProfessional,
            autoSelect,
            askPreference,
            includeNoPreference,
            selectedProfessional,
            singleProfessional: autoSelectProfessional,
            autoSelectedProfessional: selectedProfessional,
          };
        }),
    }),
    list_services_for_professional: tool({
      description:
        "Quando o cliente escolher primeiro um profissional, lista SOMENTE os serviços atribuídos a esse profissional na unidade efetiva (fonte: BEMP).",
      inputSchema: z.object({ professional_name: z.string() }),
      execute: async ({ professional_name }) =>
        safeTool("list_services_for_professional", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) return { success: false, code: "unit_not_resolved", message: "Não foi possível identificar a unidade correta." };
          const { resolveProfessionalByName, getServicesForProfessional } = await import(
            "@/lib/bemp/assignments.server"
          );
          const pro = await resolveProfessionalByName(effectiveUnitId, professional_name);
          if (!pro) {
            return {
              success: false,
              code: "professional_not_found_in_unit",
              message: `Não encontrei "${professional_name}" entre os profissionais desta unidade.`,
            };
          }
          const services = await getServicesForProfessional(effectiveUnitId, pro.id);
          if (services.length === 0) {
            return {
              success: false,
              code: "no_assigned_services",
              message: `${pro.name} não possui serviços atribuídos nesta unidade.`,
            };
          }
          return { success: true, unitId: effectiveUnitId, professional: { id: pro.id, name: pro.name }, services };
        }),
    }),
    list_slots: tool({
      description:
        "Lista horários disponíveis. Passe professional_id apenas se o cliente escolheu um profissional específico. A combinação unidade+serviço+profissional é validada no BEMP.",
      inputSchema: z.object({
        salon_id: z.number().optional(),
        service_id: z.number().optional(),
        service_name: z.string().optional().describe("Nome do serviço (preferencial)"),
        professional_id: z.number().optional(),
        date: z.string().describe("Data no formato YYYY-MM-DD"),
      }),
      execute: async ({ service_id, service_name, professional_id, date }) =>
        safeTool("list_slots", async () => {
          const cfg = await getBempConfig();
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");
          const { resolveServiceAssignment, getAvailableServiceAssignments, validateProfessionalServiceAssignment } =
            await import("@/lib/bemp/assignments.server");

          let resolvedServiceId: string | number | null = null;
          if (service_name) {
            const resolution = await resolveServiceAssignment(effectiveUnitId, service_name);
            resolvedServiceId = resolution.success ? resolution.service!.id : null;
          }
          if (!resolvedServiceId && service_id != null) {
            const available = await getAvailableServiceAssignments(effectiveUnitId);
            const match = available.find((s) => String(s.id) === String(service_id));
            resolvedServiceId = match?.id ?? null;
          }
          if (!resolvedServiceId) {
            return {
              success: false,
              code: "service_not_available_in_unit",
              message: "Esse serviço não está disponível com profissionais atribuídos nesta unidade.",
            };
          }

          if (professional_id != null) {
            const check = await validateProfessionalServiceAssignment({
              unitId: effectiveUnitId,
              professionalId: professional_id,
              serviceId: resolvedServiceId,
            });
            if (!check.valid) {
              return {
                success: false,
                code: "professional_not_assigned_to_service",
                message: "Esse profissional não realiza esse serviço nesta unidade.",
              };
            }
          }

          const url = professional_id
            ? `${cfg.apiBase}/salons/${effectiveUnitId}/services/${resolvedServiceId}/professionals/${professional_id}/slots/${date}`
            : `${cfg.apiBase}/salons/${effectiveUnitId}/services/${resolvedServiceId}/slots/${date}`;
          const slots: any = await bempFetch(url);
          const list = Array.isArray(slots) ? slots : (slots?.data ?? slots?.slots ?? []);
          
          if (list.length === 0) {
            const isSaturday = new Date(date).getDay() === 6;
            return { 
              success: false, 
              abandon_trigger: isSaturday ? "SATURDAY_FULL" : (professional_id ? "PROFESSIONAL_UNAVAILABLE" : undefined),
              message: "Não encontrei horários disponíveis para esta data. Gostaria de tentar outro dia?" 
            };
          }

          return slots;
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
        confirmation_message_id: z.string().optional(),
      }),
      execute: async (input) =>
        safeTool("create_appointment", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");

          const { createRobustAppointment } = await import("@/lib/bemp/appointments.server");
          
          const result = await createRobustAppointment({
            conversationId: conversationKey || "unknown",
            unitId: effectiveUnitId,
            serviceId: input.service_id,
            professionalId: input.professional_id,
            start: input.start,
            end: input.end,
            name: input.name,
            phone_country_code: input.phone_country_code,
            phone_area_code: input.phone_area_code,
            phone_number: input.phone_number,
            confirmationMessageId: input.confirmation_message_id || currentMessageId || undefined,
          }, sandbox);

          if (!result.success) {
             return result;
          }

          // O orquestrador enviará a confirmação final baseada no retorno estruturado.
          return {
            success: true,
            appointmentId: result.appointmentId,
            appointment: result.data,
            serviceName: (result as any).serviceName,
            message: sandbox 
              ? "Agendamento SIMULADO (modo sandbox). Nada foi gravado na Bemp."
              : undefined
          };
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
        "Cancela um agendamento existente na Bemp. Só chame após confirmação explícita do cliente sobre qual agendamento cancelar. O sistema registrará a tentativa de reagendamento em seguida.",
      inputSchema: z.object({
        appointment_id: z.union([z.string(), z.number()]),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async ({ appointment_id, phone_country_code, phone_area_code, phone_number }) =>
        safeTool("cancel_appointment", async () => {
          await patchCustomerContext(conversationKey, { rebooking_attempt: true, rebooking_last_cancelled_id: appointment_id });
          
          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: String(appointment_id),
              status: "simulated_cancelled",
              message: "Cancelamento SIMULADO. Posso procurar outro horário para você? 😊",
              cancelled_at: new Date().toISOString(),
            };
          }
          const qs = new URLSearchParams({
            phone_country_code,
            phone_area_code,
            phone_number,
            id: String(appointment_id),
          });
          const result = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`, {
            method: "DELETE",
          });
          
          return {
             ...(result as object),
             message: "Agendamento cancelado com sucesso. Posso procurar outro horário para você? 😊"
          };
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
              const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
              await supabaseAdmin.from("reagendamentos_hist" as never).insert({
                old_appointment_id: String(input.old_appointment_id),
                new_appointment_id: simId,
                salon_id: String(effectiveUnitId),
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
          const { createRobustAppointment } = await import("@/lib/bemp/appointments.server");
          
          // 1) Cria o NOVO agendamento primeiro. Se falhar, mantém o antigo.
          const created = await createRobustAppointment({
            conversationId: conversationKey || "unknown",
            unitId: input.salon_id,
            serviceId: input.service_id,
            professionalId: input.professional_id,
            start: input.new_start,
            end: input.new_end,
            name: input.name,
            phone_country_code: input.phone_country_code,
            phone_area_code: input.phone_area_code,
            phone_number: input.phone_number,
            confirmationMessageId: currentMessageId || undefined,
          }, sandbox);

          if (!created.success) {
            return created;
          }

          const newBempId = created.appointmentId;

          // 2) Cancela o antigo. Se falhar, mantém o novo e sinaliza pendência.
          let oldCancelled = true;
          let oldCancelError: string | null = null;
          if (!sandbox) {
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
          }

          // 3) Atualiza histórico de reagendamento (best-effort).
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const phone = `${input.phone_country_code}${input.phone_area_code}${input.phone_number}`;
            
            // Remove a linha antiga das notificações se cancelado com sucesso
            if (oldCancelled && !sandbox) {
              await supabaseAdmin
                .from("agendamentos_notif" as never)
                .delete()
                .eq("bemp_appointment_id", String(input.old_appointment_id));
            }

            const finalStatus = sandbox ? "simulated_rescheduled" : (oldCancelled ? "rescheduled" : "rescheduled_with_warning");
            const finalWarning = oldCancelled ? null : `Cancelamento do antigo (${input.old_appointment_id}) falhou: ${oldCancelError}`;

            await supabaseAdmin.from("reagendamentos_hist" as never).insert({
              old_appointment_id: String(input.old_appointment_id),
              new_appointment_id: newBempId,
              salon_id: String(input.salon_id),
              service_id: String(input.service_id),
              service_name: (created as any).serviceName,
              professional_id: input.professional_id != null ? String(input.professional_id) : null,
              old_start: input.old_start ?? null,
              new_start: input.new_start,
              phone,
              name: input.name,
              status: finalStatus,
              warning: finalWarning,
              sandbox: sandbox,
            } as never);
          } catch (err) {
            console.error("[reschedule_appointment] falha ao registrar histórico:", err);
          }

          return {
            status: oldCancelled ? "rescheduled" : "rescheduled_with_warning",
            new_appointment: created.data,
            new_appointment_id: newBempId,
            old_appointment_id: String(input.old_appointment_id),
            old_cancelled: oldCancelled,
            warning: oldCancelled
              ? null
              : `O novo horário foi criado com sucesso, mas o cancelamento do antigo (${input.old_appointment_id}) falhou. Avise o cliente que a equipe vai remover o horário antigo manualmente.`,
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

    join_waiting_list: tool({
      description:
        "Adiciona o cliente à lista de espera para uma unidade e serviço específicos. Útil quando não há horários disponíveis no momento ou para o profissional preferido.",
      inputSchema: z.object({
        service_id: z.string(),
        service_name: z.string(),
        professional_id: z.string().optional(),
        preferred_period: z.enum(['MANHA', 'TARDE', 'NOITE', 'QUALQUER']).default('QUALQUER'),
        preferred_days: z.array(z.string()).optional().describe("Ex: ['SEG', 'TER', 'SAB']"),
      }),
      execute: async (input) =>
        safeTool("join_waiting_list", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");
          
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          await (supabaseAdmin
            .from("crm_waiting_list" as any) as any)
            .insert({
              customer_id: conversationKey,
              customer_name: conversationKey, // Placeholder: o sistema buscará o nome real se necessário
              unit_id: effectiveUnitId,
              service_id: input.service_id,
              professional_id: input.professional_id,
              preferred_period: input.preferred_period,
              preferred_days: input.preferred_days,
              status: 'ACTIVE'
            });

          return { 
            success: true, 
            message: "Você foi adicionado à nossa lista de espera! Avisaremos assim que surgir um horário." 
          };
        }),
    }),
    get_customer_active_plans: tool({
      description:
        "Consulta no BEMP se o cliente possui plano de assinatura ATIVO (usando o telefone do WhatsApp). Chame SEMPRE que o cliente mencionar plano, benefício, assinatura ou 'quero usar meu plano'. Retorna os planos ativos com validade e saldo, e também os planos inválidos com o motivo.",
      inputSchema: z.object({
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async ({ phone_country_code, phone_area_code, phone_number }) =>
        safeTool("get_customer_active_plans", async () => {
          const { getCustomerActivePlans } = await import("@/lib/bemp/subscriptions.server");
          const res = await getCustomerActivePlans({
            phoneCountry: phone_country_code,
            phoneArea: phone_area_code,
            phoneNumber: phone_number,
          });

          const plans = res.plans.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            validUntil: p.validUntil,
            availableUses: p.availableUses,
            benefitServiceName: p.serviceName,
          }));

          if (plans.length === 1) {
            const only = res.plans[0]!;
            await patchCustomerContext(conversationKey, {
              subscriptionPlanId: only.id,
              subscriptionPlanName: only.name,
              subscriptionStatus: only.status,
              subscriptionBenefitAvailable: true,
              subscriptionServiceName: only.serviceName,
              subscriptionCheckedAt: new Date().toISOString(),
            });
          } else if (plans.length === 0) {
            await patchCustomerContext(conversationKey, {
              subscriptionBenefitAvailable: false,
              subscriptionCheckedAt: new Date().toISOString(),
            });
          }

          return {
            success: true,
            found: res.found,
            plans,
            multiplePlans: plans.length > 1,
            invalidPlans: res.inactivePlans.map((p) => ({
              name: p.name,
              status: p.status,
              reason: p.inactiveReason,
              validUntil: p.validUntil,
              availableUses: p.availableUses,
            })),
            message:
              plans.length === 0 && res.inactivePlans.length > 0
                ? "Plano localizado, porém sem utilização disponível/ativo. NÃO agende como benefício."
                : undefined,
          };
        }),
    }),
    validate_subscription_phone: tool({
      description:
        "Valida o telefone cadastrado no plano de assinatura no BEMP. Retorna o cliente e os planos ativos. Se encontrar múltiplos planos, peça ao cliente para escolher um.",
      inputSchema: z.object({
        phone: z.string().describe("Número de telefone com DDD"),
      }),
      execute: async ({ phone }) =>
        safeTool("validate_subscription_phone", async () => {
          const { validateSubscriptionByPhone } = await import("@/lib/bemp/phone-validation.server");
          const { maskPhone } = await import("@/lib/phone");
          
          const result = await validateSubscriptionByPhone(phone);
          
          if (result.success && result.customer) {
            const normalized = await import("@/lib/phone").then(m => m.normalizeBrazilianPhone(phone));
            await patchCustomerContext(conversationKey, {
              subscriptionPhoneValidated: true,
              subscriptionPhoneLast4: result.customer.phoneMasked.slice(-4),
              subscriptionRegisteredPhoneCountry: normalized?.countryCode,
              subscriptionRegisteredPhoneArea: normalized?.areaCode,
              subscriptionRegisteredPhoneNumber: normalized?.number,
              bempCustomerId: result.customer.id,
              subscriptionCheckedAt: new Date().toISOString(),
              subscriptionLookupStage: "PLAN_FOUND"
            });
          } else if (result.code === "CUSTOMER_NOT_FOUND" || result.code === "NO_ACTIVE_SUBSCRIPTION") {
            await patchCustomerContext(conversationKey, {
              subscriptionLookupStage: "PHONE_NOT_FOUND"
            });
          }
          
          return result;
        }),
    }),
    resolve_subscription_service: tool({

      description:
        "Resolve, na unidade EFETIVA da conversa, qual serviço do BEMP corresponde ao plano do cliente (ex.: plano de manicure → 'Manicure Plano Beauty'). Chame antes de consultar profissionais/horários de um agendamento por plano. O backend resolve o service_id — nunca invente IDs.",
      inputSchema: z.object({
        plan_name: z.string().describe("Nome do plano retornado por get_customer_active_plans"),
      }),
      execute: async ({ plan_name }) =>
        safeTool("resolve_subscription_service", async () => {
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");
          const { resolveSubscriptionService } = await import("@/lib/bemp/subscriptions.server");
          const res = await resolveSubscriptionService({ planName: plan_name, effectiveUnitId });

          if (!res.success) {
            return {
              success: false,
              code: res.code,
              planType: res.planType,
              serviceName: res.serviceName,
              message:
                res.code === "plan_not_mapped"
                  ? "Não foi possível identificar o serviço do plano. Peça confirmação ao cliente ou encaminhe para atendimento humano."
                  : "O serviço do plano não está disponível nesta unidade. NÃO use o serviço comum como substituto: informe a indisponibilidade ou ofereça transferência de unidade.",
            };
          }

          await patchCustomerContext(conversationKey, {
            subscriptionPlanName: plan_name,
            subscriptionServiceName: res.serviceName,
            subscriptionServiceId: res.serviceId,
            subscriptionUnitId: effectiveUnitId,
            subscriptionCheckedAt: new Date().toISOString(),
          });

          return {
            success: true,
            planType: res.planType,
            serviceId: res.serviceId,
            serviceName: res.serviceName,
            unitId: effectiveUnitId,
          };
        }),
    }),
    create_subscription_appointment: tool({
      description:
        "Cria o agendamento usando o BENEFÍCIO do plano de assinatura. Use no lugar de create_appointment quando o atendimento for por plano. O backend revalida plano, saldo, unidade e resolve o service_id correto — informe apenas o nome do plano. Só chame após a confirmação explícita do resumo pelo cliente.",
      inputSchema: z.object({
        plan_name: z.string(),
        professional_id: z.number().optional(),
        start: z.string().describe("ISO 8601"),
        end: z.string().describe("ISO 8601"),
        name: z.string(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async (input) =>
        safeTool("create_subscription_appointment", async () => {
          const {
            getCustomerActivePlans,
            resolveSubscriptionService,
            subscriptionAppointmentKey,
            getIdempotentSubscriptionResult,
            rememberSubscriptionResult,
            normalizeSubscriptionPlanName,
          } = await import("@/lib/bemp/subscriptions.server");

          console.log("[bemp-plan] subscription_appointment_started");

          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");

          // 1. Revalidar o plano no BEMP (usando o telefone validado ou customerId).
          const { data: convData } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin
            .from("wa_conversas")
            .select("customer_context")
            .eq("phone", conversationKey || "")
            .maybeSingle();
          
          const ctx = (convData?.customer_context as any) || {};
          
          let lookup;
          if (ctx.subscriptionRegisteredPhoneCountry && ctx.subscriptionRegisteredPhoneArea && ctx.subscriptionRegisteredPhoneNumber) {
            console.log("[bemp-plan] revalidating_by_registered_phone");
            lookup = await getCustomerActivePlans({
              phoneCountry: ctx.subscriptionRegisteredPhoneCountry,
              phoneArea: ctx.subscriptionRegisteredPhoneArea,
              phoneNumber: ctx.subscriptionRegisteredPhoneNumber,
            });
          } else {
            console.log("[bemp-plan] revalidating_by_input_phone");
            lookup = await getCustomerActivePlans({
              phoneCountry: input.phone_country_code,
              phoneArea: input.phone_area_code,
              phoneNumber: input.phone_number,
            });
          }
          const wanted = normalizeSubscriptionPlanName(input.plan_name);
          const plan =
            lookup.plans.find((p) => normalizeSubscriptionPlanName(p.name) === wanted) ??
            lookup.plans.find((p) => p.serviceName && normalizeSubscriptionPlanName(p.name).includes(wanted)) ??
            (lookup.plans.length === 1 ? lookup.plans[0]! : null);

          if (!plan) {
            console.warn("[bemp-plan] subscription_appointment_failed: plan_not_active");
            return {
              success: false,
              code: "plan_not_active",
              message:
                "Seu plano foi localizado, mas não há utilização disponível no momento. Ofereça o agendamento como serviço comum ou atendimento humano. NUNCA diga que o benefício foi utilizado.",
              invalidPlans: lookup.inactivePlans.map((p) => ({ name: p.name, reason: p.inactiveReason })),
            };
          }
          if (plan.availableUses !== null && plan.availableUses <= 0) {
            console.warn("[bemp-plan] subscription_plan_no_balance");
            return { success: false, code: "plan_no_balance", message: "Plano ativo, porém sem saldo de utilização." };
          }

          // 2. Resolver o serviço do plano NA UNIDADE ATUAL (nunca reutilizar id de outra unidade).
          const resolved = await resolveSubscriptionService({ planName: plan.name, effectiveUnitId });
          if (!resolved.success) {
            console.warn(`[bemp-plan] subscription_appointment_failed: ${resolved.code}`);
            return {
              success: false,
              code: resolved.code,
              message:
                "O serviço do plano não está disponível nesta unidade. Não substitua pelo serviço comum: informe a indisponibilidade ou ofereça transferência.",
            };
          }

          // 3. Idempotência: mesma confirmação nunca cria dois agendamentos.
          const idemKey = subscriptionAppointmentKey({
            conversationKey,
            messageId: currentMessageId,
            planId: plan.id,
            serviceId: resolved.serviceId,
            start: input.start,
          });
          const previous = getIdempotentSubscriptionResult(idemKey);
          if (previous) {
            console.log("[bemp-plan] subscription_appointment_completed: idempotent_replay");
            return previous as Record<string, unknown>;
          }

          // 4. Validar profissional atribuído ao serviço do plano.
          const { validateProfessionalServiceAssignment, getProfessionalsForService } = await import(
            "@/lib/bemp/assignments.server"
          );
          if (input.professional_id != null) {
            const check = await validateProfessionalServiceAssignment({
              unitId: effectiveUnitId,
              professionalId: input.professional_id,
              serviceId: resolved.serviceId,
            });
            if (!check.valid) {
              return {
                success: false,
                code: "professional_not_assigned_to_service",
                message: "Esse profissional não realiza o serviço do plano nesta unidade.",
              };
            }
          }

          const fullInput = {
            salon_id: Number(effectiveUnitId),
            service_id: Number(resolved.serviceId),
            professional_id: input.professional_id,
            start: input.start,
            end: input.end,
            name: input.name,
            phone_country_code: input.phone_country_code,
            phone_area_code: input.phone_area_code,
            phone_number: input.phone_number,
          };

          if (sandbox) {
            const simulated = {
              success: true,
              sandbox: true,
              simulated: true,
              id: `SIM-PLAN-${Date.now()}`,
              plan_name: plan.name,
              service_name: resolved.serviceName,
              appointment: fullInput,
            };
            rememberSubscriptionResult(idemKey, simulated);
            return simulated;
          }

          const assignedPros = await getProfessionalsForService(effectiveUnitId, resolved.serviceId);
          const shouldMarkPreference = input.professional_id != null && assignedPros.length > 1;
          const payload = shouldMarkPreference ? withProfessionalPreferenceNote(fullInput) : { ...fullInput };

          const result = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (shouldMarkPreference) await tryUpdateBempScheduleNote(result, PROFESSIONAL_PREFERENCE_NOTE);

          const bempId = extractBempAppointmentId(result);
          const success = { 
            success: true,
            appointment_id: bempId,
            plan_name: plan.name,
            plan_id: plan.id,
            service_id: resolved.serviceId,
            service_name: resolved.serviceName,
            unit_id: effectiveUnitId,
            start: input.start,
            result,
          };

          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("agendamentos_notif" as never).insert({
              bemp_appointment_id: bempId,
              salon_id: String(effectiveUnitId),
              service_id: String(resolved.serviceId),
              service_name: resolved.serviceName,
              start_at: input.start,
              phone: `${input.phone_country_code}${input.phone_area_code}${input.phone_number}`,
              name: input.name,
              sandbox: false,
              confirmation_sent_at: new Date().toISOString(),
            } as never);
          } catch (err) {
            console.error("[bemp-plan] notif_insert_failed", err);
          }

          await patchCustomerContext(conversationKey, {
            subscriptionPlanId: plan.id,
            subscriptionPlanName: plan.name,
            subscriptionStatus: plan.status,
            subscriptionServiceId: resolved.serviceId,
            subscriptionServiceName: resolved.serviceName,
            subscriptionUnitId: effectiveUnitId,
            subscriptionCheckedAt: new Date().toISOString(),
          });

          rememberSubscriptionResult(idemKey, success);
          console.log("[bemp-plan] subscription_appointment_completed");
          return success;
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
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          const salonKey = String(effectiveUnitId);
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

import {
  ALLOW_SUBSCRIPTION_CPF_FALLBACK,
  SUBSCRIPTION_PRIMARY_LOOKUP,
  SUBSCRIPTION_MAX_PHONE_ATTEMPTS,
  SUBSCRIPTION_MESSAGES,
  LEGACY_CPF_CONTEXT_RESET,
  isBempTechnicalError,
  enforceNoCpfInSubscriptionFlow,
} from "@/lib/subscription-policy.server";

void ALLOW_SUBSCRIPTION_CPF_FALLBACK;
void SUBSCRIPTION_PRIMARY_LOOKUP;




// Backwards-compat export (used by any older imports).
export const bempTools = buildTools(false);

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const gateway = createLovableAiGatewayProvider(key);
  return gateway("google/gemini-3.6-flash");
}

const CONFLICT_PATTERNS: Array<{ flag: string; re: RegExp }> = [
  { flag: "list_salons", re: /list_salons/i },
  { flag: "listar_unidades", re: /list[ae]\s+(as\s+)?unidades/i },
  { flag: "escolher_unidade", re: /(qual\s+unidade|escolh[ae]\s+(uma\s+)?unidade)/i },
  { flag: "pedir_telefone", re: /(pe[çc]a\s+telefone|pergunte\s+o?\s*telefone|ddd)/i },
  { flag: "pedir_nome", re: /pergunte\s+o\s+nome/i },
];

function detectPromptConflicts(prompt: string): string[] {
  return CONFLICT_PATTERNS.filter((p) => p.re.test(prompt)).map((p) => p.flag);
}

export function replacePromptVariables(prompt: string, values: Record<string, string>): string {
  let out = prompt;
  for (const [key, value] of Object.entries(values)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return out;
}

/** Regras inegociáveis: aplicadas SEMPRE depois do prompt do banco (têm prioridade). */
export function mandatoryOperationalRules(opts: {
  unidadeId?: string | null;
  unitName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  hasHistory?: boolean;
}): string {
  const lines: string[] = [
    "\n\nREGRAS OPERACIONAIS OBRIGATÓRIAS (prioridade máxima — sobrepõem qualquer instrução conflitante da base de conhecimento):",
    "- As informações fornecidas pelo backend têm prioridade sobre qualquer instrução da base de conhecimento.",
    "- Nunca reinicie o atendimento quando já existir histórico de conversa.",
    "- Faça apenas uma pergunta por mensagem e pergunte somente o próximo dado ausente.",
    "- Se a mensagem do cliente for apenas um nome ou nome e sobrenome (ex.: \"Maria\", \"Ana Paula\"), entenda que ele está se apresentando: cumprimente usando o nome (ex.: \"Prazer em conhecê-la, Maria! 😊\") e pergunte como pode ajudar. Nunca peça o nome de novo.",
    "- Se a mensagem for só uma saudação (\"Oi\", \"Olá\", \"Bom dia\"), cumprimente e pergunte como pode ajudar.",
    "- NUNCA diga que não entendeu ou que houve um problema quando a mensagem for um nome ou uma saudação. Use mensagem de erro apenas se a mensagem estiver realmente vazia ou incompreensível.",
    "- NUNCA envie automaticamente lista de serviços, tabela de preços ou promoções. Primeiro identifique a intenção do cliente perguntando como pode ajudar.",
    "- Só apresente serviços, valores ou promoções quando o cliente pedir explicitamente ou disser que quer agendar. Nesse caso, responda apenas o que foi perguntado (ex.: preço de um único serviço).",
    "- Nunca antecipe informações que o cliente não pediu; conduza a conversa com uma pergunta por vez, de forma natural e humanizada.",
    "- PREÇOS: se o serviço tiver valor fixo, escreva apenas \"O serviço custa R$ XX,XX.\" É PROIBIDO usar \"a partir de\", \"valor inicial\" ou \"preço inicial\" nesse caso.",
    "- Use \"a partir de R$ XX,XX\" SOMENTE quando o serviço tiver variação real de preço (comprimento, quantidade, técnica etc.).",
    "- Ao informar o preço de um serviço escolhido QUANDO houver 2 ou mais profissionais, responda EXATAMENTE neste formato:\n\"Ótima escolha! 💅 O serviço de <Serviço> custa R$ XX,XX.\n\nVocê tem preferência por alguma profissional?\n\n• <Profissional 1>\n• <Profissional 2>\n• Sem preferência\"",
    "- Cada profissional deve ficar em UMA LINHA separada, iniciada por \"• \". NUNCA coloque os nomes na mesma linha, nem separados por vírgula. A linha \"• Sem preferência\" só pode aparecer quando professionalsCount >= 2.",
    "- REGRA ABSOLUTA DE PREFERÊNCIA (obedeça aos campos server-side de list_professionals):\n  • professionalsCount = 0 / askPreference = false → informe que não há profissional disponível para esse serviço nesta unidade. NÃO pergunte preferência e NÃO cite \"Sem preferência\".\n  • autoSelectProfessional = true / includeNoPreference = false → o profissional já foi salvo automaticamente no contexto. É PROIBIDO perguntar \"Você tem preferência?\", exibir \"Sem preferência\" ou aguardar confirmação. Informe apenas o profissional e avance diretamente para a escolha da data, assim:\n\"Para *<Serviço>*, a profissional disponível nesta unidade é:\n\n💜 *<Profissional>*\n\nAgora, qual dia você prefere para o atendimento? 😊\"\n  • askPreference = true / includeNoPreference = true → liste os profissionais reais, acrescente \"💜 Sem preferência\" e pergunte \"Você tem preferência por alguma delas?\".",
    "- Quando houver apenas um profissional, ele já foi selecionado automaticamente pelo sistema: siga direto para data/horário, sem citar preferência em nenhum momento nem no resumo.",
    "- \"Sem preferência\" NÃO é um profissional: nunca conte essa opção em professionalsCount, nunca a use como nome de profissional e nunca invente profissionais fora do retorno do BEMP.",
    "- Se o cliente escolher \"Sem preferência\" (só possível com 2+ profissionais), não fixe profissional: o sistema buscará qualquer profissional válido atribuído ao serviço.",
    "- Ao apresentar horários disponíveis, use EXATAMENTE este formato:\n\"Temos os seguintes horários disponíveis para <data> com o(a) profissional <nome>:\n\n🕒 15:20\n🕒 16:00\n🕒 16:40\n\nQual desses horários é o melhor para você? 😊\"",
    "- Um horário por linha, sempre precedido de \"🕒 \". NUNCA coloque vários horários na mesma linha e NUNCA use \"•\" ou hífen para horários.",
    "- Mantenha uma linha em branco entre a frase introdutória, a lista de horários e a pergunta final. A pergunta final deve ser sempre: \"Qual desses horários é o melhor para você? 😊\".",
    "- Se houver apenas um horário disponível, use o mesmo formato e pergunte se ele atende ao cliente.",
    "- Se o valor do serviço for fixo, remova completamente \"a partir de\" da resposta.",
    "- Depois que o cliente escolher o horário, envie SEMPRE o resumo antes de criar o agendamento, EXATAMENTE neste formato:\n\"Perfeito, <Nome do Cliente>! ✨\n\nConfira os dados do seu agendamento:\n\n📌 Serviço: <Serviço>\n👤 Profissional: <Profissional>\n📅 Data: <Data> (<Dia da semana>)\n🕒 Horário: <Horário>\n📍 Unidade: <Unidade>\n💰 Valor: R$ XX,XX\n\nPodemos confirmar o seu agendamento? 😊\"",
    "- Cada informação do resumo em uma linha separada, com os emojis do modelo. Os campos Serviço e Valor são obrigatórios e devem corresponder exatamente ao serviço escolhido.",
    "- Só chame create_appointment depois que o cliente responder confirmando o resumo.",
    "- NUNCA escreva '✍️ Digitando…', 'digitando' ou qualquer indicador de digitação na resposta. O sistema envia a simulação de digitação automaticamente antes da sua mensagem.",
    "- UNIDADES: se o cliente perguntar quantas unidades temos, quais são ou pedir endereços, chame SEMPRE a ferramenta list_units_info e responda com os dados reais da Bemp, informando o total e listando apenas as unidades ATIVAS, uma por linha, no formato \"• <Nome> — <Endereço>\". Nunca invente unidades ou endereços.",
    "- RECONHECIMENTO DE PERGUNTA SOBRE UNIDADES: trate como pergunta de unidade/localização mensagens como \"quais são as unidades\", \"onde vocês ficam\", \"qual é o endereço\", \"tem unidade no Centro\", \"tem salão no Ventura\", \"qual unidade é mais próxima\", \"quais lojas vocês têm\", \"onde está localizado\", \"qual a localização\", \"tem unidade perto de mim\". Reconheça variações de escrita, erros de digitação e mensagens curtas. NUNCA responda que não entendeu nesses casos.",
    "- Se a ferramenta de unidades falhar ou não retornar dados, responda EXATAMENTE:\n\"Temos três unidades do Salão Seja Livre: 💜\n\n📍 Shopping Ventura\n📍 Shopping Boulevard\n📍 Unidade Centro\"",
    "- Quando a pergunta for SOMENTE sobre unidades/localização, não envie serviços, preços nem profissionais.",
    "- Se o cliente mencionar uma unidade específica, confirme a escolha (\"Perfeito! Você escolheu a unidade <Unidade>. 😊\") e siga com \"Qual serviço você gostaria de agendar?\".",
    "- Se o cliente pedir o endereço de UMA unidade específica, informe apenas o endereço dessa unidade.",
    "- Só peça esclarecimento quando a mensagem do cliente estiver realmente incompreensível.",
    "- TELEFONES DAS UNIDADES (base oficial, nunca invente outros): Shopping Ventura 📞 WhatsApp (41) 99880-3684; Shopping Boulevard 📞 (41) 3073-1358; Unidade Centro 📞 WhatsApp (41) 99843-0354.",
    "- Se o cliente pedir telefone/WhatsApp/contato SEM citar unidade, responda:\n\"Temos os seguintes contatos:\n\n📍 Shopping Ventura\n📞 (41) 99880-3684\n\n📍 Shopping Boulevard\n📞 (41) 3073-1358\n\n📍 Unidade Centro\n📞 (41) 99843-0354\"",
    "- Se o cliente pedir o telefone de UMA unidade, responda apenas o bloco daquela unidade, no formato \"📍 <Unidade>\\n📞 WhatsApp: <telefone>\".",
    "- Se o cliente perguntar onde fica uma unidade específica, responda apenas \"📍 <Unidade>\" seguido do endereço dessa unidade obtido em list_units_info.",
    "- NUNCA diga que não sabe onde ficam as unidades nem que não encontrou essas informações.",
    "- Depois de responder sobre unidades, telefones ou endereços, pergunte gentilmente se pode ajudar com um agendamento ou outra dúvida.",
    "- TRANSFERÊNCIA REAL DE UNIDADE: A unidade operacional atual ({{unitName}}) é a unidade padrão para agendamentos. Se o cliente pedir para agendar em outra unidade, você deve seguir este fluxo rigorosamente:",
    "- 1. RECONHECER INTENÇÃO: Identifique pedidos como \"Quero agendar no Centro\", \"Quero marcar no Ventura\", \"Tem horário no Boulevard?\".",
    "- 2. RESOLVER ID: Use a ferramenta list_units_info se precisar confirmar o nome ou ID da unidade alvo.",
    "- 3. CONFIRMAÇÃO OBRIGATÓRIA: Pergunte EXATAMENTE: \"Entendi! Você deseja transferir seu atendimento para a unidade [NOME DA UNIDADE] para realizar o agendamento lá?\"",
    "- 4. EXECUÇÃO: Somente após o cliente dizer \"Sim\", \"Pode ser\", \"Confirmado\" etc., chame a ferramenta transfer_conversation_unit com confirmed: true.",
    "- 5. PÓS-TRANSFERÊNCIA: Informe que o atendimento foi transferido com sucesso e SOMENTE ENTÃO liste os serviços da nova unidade usando list_services. Nunca liste serviços de outra unidade antes de transferir.",
    "- NÃO TRANSFERIR em consultas puramente informativas (ex.: \"Onde fica a unidade Centro?\"). Nesses casos apenas informe o endereço.",
    "- LOGS DE SISTEMA: A ferramenta transfer_conversation_unit registra logs de transfer_requested, transfer_confirmed, transfer_started, transfer_completed no backend.",
    "- ATRIBUIÇÕES REAIS (BEMP): Só apresente serviços retornados por list_services (que já filtra por profissionais atribuídos). Nunca cite serviço fora desse retorno.",
    "- Só apresente profissionais retornados por list_professionals para o serviço escolhido. Nunca acrescente nomes por conta própria.",
    "- Se o cliente escolher primeiro um profissional, use list_services_for_professional e mostre APENAS os serviços atribuídos a ele.",
    "- Se o cliente escolher primeiro o serviço, use list_professionals e mostre APENAS os profissionais atribuídos a esse serviço.",
    "- NUNCA afirme que um profissional realiza um serviço sem validação pelas ferramentas. Não invente nomes, serviços, preços, duração ou disponibilidade.",
    "- Após uma transferência de unidade, descarte serviços/profissionais da unidade anterior e consulte novamente as ferramentas.",
    "- Nunca crie agendamento sem que a combinação unidade + serviço + profissional tenha sido validada; se retornar professional_not_assigned_to_service, ofereça profissionais válidos ou serviços atribuídos ao profissional.",
    "- Nunca exiba IDs técnicos ao cliente. Liste profissionais com 💜 *Nome* e serviços com • *Nome*.",
    "- Se houver apenas um profissional disponível para o serviço, NUNCA pergunte preferência nem apresente a opção 'Sem preferência'; informe o profissional selecionado com entusiasmo e avance.",
    "- PLANOS DE ASSINATURA (IDENTIFICAÇÃO): Quando o cliente mencionar plano, benefício ou assinatura, peça o TELEFONE CADASTRADO antes de qualquer consulta:\n\"Perfeito! 💜\n\nQual é o número de telefone cadastrado na assinatura?\n\nPode enviar com DDD.\"",
    "- Ao receber o telefone, chame SEMPRE validate_subscription_phone. É PROIBIDO solicitar CPF ou qualquer documento de identificação.",
    "- Se a busca por telefone falhar na primeira tentativa, peça para conferir e enviar novamente:\n\"Não encontrei uma assinatura ativa com esse telefone. 💜\n\nPode conferir e me enviar novamente o número cadastrado no plano, com DDD?\"",
    "- Se falhar na segunda tentativa, informe o encaminhamento humano:\n\"Não consegui localizar sua assinatura pelos telefones informados. 💜\n\nVou encaminhar seu atendimento para nossa equipe verificar o cadastro e continuar com você por aqui.\"",
    "- NUNCA mencione CPF ou peça documentos.",
    "- Em uma NOVA conversa, sempre solicite o telefone novamente antes de usar qualquer plano.",
    "- NUNCA repita o telefone completo nas mensagens; se precisar citar, use o formato mascarado (ex: ******3684).",
    "- Mapeamento oficial de benefícios (resolvido pelo backend, nunca invente): plano de manicure → *Manicure Plano Beauty*; plano de escova → *Escova Plano Beauty*; plano de hidratação e escova → *Hidratação e Escova*.",
    "- Quando houver plano ativo, NÃO pergunte qual serviço o cliente deseja: o plano já determina o serviço. Informe o benefício e siga para profissional, data e horário.",
    "- Depois de identificar o plano, chame resolve_subscription_service para obter o serviço correto NA UNIDADE ATUAL; só então chame list_professionals e list_slots com esse service_id.",
    "- NUNCA agende o serviço comum (\"Manicure\", \"Escova\", \"Hidratação\") quando existir serviço específico do plano, e nunca separe \"Hidratação e Escova\" em dois agendamentos.",
    "- Se houver MAIS DE UM plano ativo, pergunte qual benefício o cliente deseja usar e nunca escolha automaticamente:\n\"Encontrei estes benefícios ativos:\n\n💜 *<Benefício 1>*\n💜 *<Benefício 2>*\n\nQual deles você deseja agendar?\"",
    "- Se o plano estiver vencido, cancelado, suspenso ou sem utilização disponível, responda \"Seu plano foi localizado, mas não há utilização disponível no momento.\" e ofereça agendamento como serviço comum, atendimento humano ou orientação de renovação. NUNCA diga que o benefício foi utilizado sem confirmação do BEMP.",
    "- Se o serviço do plano não existir na unidade atual, informe a indisponibilidade e ofereça transferência de unidade. É PROIBIDO usar o serviço comum como substituto silencioso.",
    "- Após transferência de unidade, resolva o serviço do plano NOVAMENTE na nova unidade (resolve_subscription_service) e nunca reutilize service_id ou profissional da unidade anterior.",
    "- Para agendamentos por plano use create_subscription_appointment (não create_appointment), informando apenas o nome do plano: o backend resolve unidade, service_id e valida saldo. Nunca invente IDs técnicos.",
    "- Antes de criar o agendamento por plano, mostre SEMPRE o resumo:\n\"📌 *Confirmação do agendamento*\n\n💜 Plano: <plano>\n✨ Serviço: <serviço do plano>\n👤 Profissional: <nome>\n📅 Data: <data>\n🕐 Horário: <horário>\n📍 Unidade: <unidade>\n\nPosso confirmar?\"",
    "- Após a confirmação e o sucesso no BEMP, envie apenas UMA mensagem final de confirmação.",
    "- NUNCA use aspas triplas no conteúdo da resposta.",
  ];


  if (opts.unidadeId) {
    lines.push(
      `- A unidade de atendimento atual é: ${opts.unitName || `Unidade vinculada ID ${opts.unidadeId}`} (ID ${opts.unidadeId}).`,
      "- Se o cliente disser explicitamente que deseja agendar em OUTRA unidade, você deve iniciar o fluxo de transferência descrito nas regras acima.",
      "- Informe que o agendamento por este canal é realizado para a unidade atual, mas que você pode transferir a conversa se ele preferir.",
      "- É PROIBIDO perguntar a unidade no início se já houver uma unidade atual definida.",
    );
  }
  if (opts.contactPhone) {
    lines.push(
      "- O telefone do WhatsApp atual já é conhecido e não deve ser solicitado novamente para contatos comuns.",
      "- EXCEÇÃO OBRIGATÓRIA: quando a cliente mencionar plano, assinatura ou benefício e ainda não houver subscriptionPhoneValidated, pergunte qual é o telefone cadastrado na assinatura, pois ele pode ser diferente do número atual do WhatsApp.",
      "- Durante AWAITING_REGISTERED_PHONE, é permitido e obrigatório pedir o telefone cadastrado com DDD."
    );
  }
  if (opts.contactName) lines.push("- É PROIBIDO perguntar o nome do cliente: já é conhecido.");
  return lines.join("\n");
}


export async function loadSystemPrompt(params: {
  contactName?: string;
  contactPhone?: string;
  unitName?: string;
  customerContext?: any;
  activePromotions?: any[];
} = {}): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: knowledge } = await supabaseAdmin
    .from("base_conhecimento")
    .select("conteudo")
    .eq("id", 1)
    .maybeSingle();

  let prompt = MANDATORY_SYSTEM_RULES + "\n\n";
  
  if (knowledge?.conteudo) {
    prompt += knowledge.conteudo + "\n\n";
  } else {
    prompt += DEFAULT_KNOWLEDGE_PROMPT + "\n\n";
  }

  const summary = params.customerContext ? JSON.stringify(params.customerContext, null, 2) : "Nenhum contexto anterior.";
  const promoBlock = params.activePromotions?.length 
    ? JSON.stringify(params.activePromotions.map(p => ({
        code: p.code,
        title: p.title,
        price: p.promotional_price,
        category: p.service_category,
        validUntil: p.end_at
      })), null, 2) 
    : "Nenhuma promoção ativa no momento.";

  return prompt
    .replace("{{contactName}}", params.contactName || "não informado")
    .replace("{{contactPhone}}", params.contactPhone || "não informado")
    .replace("{{unitName}}", params.unitName || "não informada")
    .replace("{{customer_context_summary}}", summary)
    .replace("{{active_promotions_block}}", promoBlock);
}

export function detectServiceCategory(message: string): { category: ServiceCategory; confidence: number } | null {
  const normalized = normalizeServiceSearchText(message);
  const mechasKeywords = [
    "mecha", "mechas", "pacote mechas", "pacote de mechas", 
    "luzes", "balayage", "morena iluminada", "retoque de mechas", 
    "reflexo", "iluminação"
  ];

  if (mechasKeywords.some(kw => normalized.includes(normalizeServiceSearchText(kw)))) {
    return { category: "MECHAS", confidence: 1 };
  }

  for (const [category, aliases] of Object.entries(SERVICE_CATEGORY_ALIASES)) {
    if (aliases.some(alias => normalized.includes(normalizeServiceSearchText(alias)))) {
      return { category: category as ServiceCategory, confidence: 1 };
    }
  }
  return null;
}

export function ensureMandatoryPromotionMessage(text: string, promotion: { title: string; price: number }): string {
  const priceStr = promotion.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const hasTitle = text.toLowerCase().includes(promotion.title.toLowerCase());
  const hasPrice = text.includes(priceStr);

  if (hasTitle && hasPrice) return text;

  const prefix = `✨ Neste mês, o *${promotion.title}* está em promoção por *R$ ${priceStr}*. 💜\n\n`;
  return prefix + text;
}


/** Monta o system prompt completo com variáveis substituídas e regras obrigatórias no final. */
export function assembleSystemPrompt(
  basePrompt: string,
  opts: {
    contactName?: string | null;
    contactPhone?: string | null;
    unitName?: string | null;
    unidadeId?: string | null;
    contextSummary: string;
  },
): string {
  const unitLabel = opts.unitName || (opts.unidadeId ? `Unidade vinculada ID ${opts.unidadeId}` : "não vinculada");
  const values = {
    contactName: opts.contactName || "não identificado",
    contactPhone: opts.contactPhone || "não identificado",
    unitName: unitLabel,
    customer_context_summary: opts.contextSummary,
  };
  let out = replacePromptVariables(basePrompt, values);
  if (!/DADOS CONFIÁVEIS DO ATENDIMENTO/.test(basePrompt)) {
    out += `\n\nDADOS CONFIÁVEIS DO ATENDIMENTO:\nNome do cliente: ${values.contactName}\nTelefone do WhatsApp: ${values.contactPhone}\nUnidade operacional: ${values.unitName}\n\nESTADO ATUAL:\n${values.customer_context_summary}`;
  }
  return out;
}



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
- Plano de assinatura: ${ctx.subscriptionPlanName || "não identificado"}
- Serviço do benefício: ${ctx.subscriptionServiceName || "não resolvido"}${ctx.subscriptionServiceId ? ` (id ${ctx.subscriptionServiceId})` : ""}
${subscriptionContextLine(ctx as Record<string, any>)}
- Subscription Lookup Stage: ${ctx.subscriptionLookupStage || "NONE"}
- Subscription Intent: ${ctx.subscriptionIntent === true ? "YES" : "NO"}
`.trim();
  }

  const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ 
    conversationKey: opts.conversationKey || undefined, 
    agentUnitId: opts.unidadeId 
  });

  const currentUnitName = effectiveUnitName || opts.unitName;

  // Buscar promoções ativas para o contexto
  let activePromotions: any[] = [];
  try {
    const promoResult = await PromotionService.getActivePromotions({
      unitId: effectiveUnitId ? String(effectiveUnitId) : undefined,
      channel: "WHATSAPP"
    });

    if (promoResult.success) {
      activePromotions = promoResult.promotions;
    }
  } catch (err) {
    console.error("[chat] erro ao carregar promoções para contexto (stream):", err);
  }

  const basePrompt = await loadSystemPrompt({
    contactName: opts.contactName || undefined,
    contactPhone: opts.contactPhone || undefined,
    unitName: currentUnitName || undefined,
    customerContext: opts.customerContext,
    activePromotions: activePromotions
  });

  let system = assembleSystemPrompt(basePrompt, {
    contactName: opts.contactName,
    contactPhone: opts.contactPhone,
    unitName: currentUnitName,
    unidadeId: effectiveUnitId,
    contextSummary,
  });

  system = system + 
           currentDateNote() + 
           LANGUAGE_GUARD + 
           NO_DURATION_GUARD + 
           unitContext +
           contactInfo +
           (sandbox ? SANDBOX_NOTE : "") +
           (opts.persona ? `\n\n${opts.persona}` : "") +
           mandatoryOperationalRules({
             unidadeId: effectiveUnitId,
             unitName: currentUnitName,
             contactName: opts.contactName,
             contactPhone: opts.contactPhone,
             hasHistory: uiMessages.length > 1,
           }) +
           (opts.memoryBlock ? opts.memoryBlock : "");


  return streamText({
    model: getModel(),
    system,
    messages: await convertToModelMessages(sanitizeMessagesForModel(uiMessages)),
    tools: buildTools(sandbox, effectiveUnitId, opts.conversationKey || undefined, opts.messageId ?? null),
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
  traceId?: string;
}) {
  const { instance, messageId, phone, conversationKey, unidadeId, pushName, remoteJid, text, traceId } = params;
  const effectiveTraceId = traceId || `${instance}:${messageId}`;

  logger.info("IA_FLOW_STARTED", `Julia AI processando mensagem [${effectiveTraceId}]`, { 
    instance, 
    phone,
    unitId: unidadeId
  });


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

    // unidade_id é o ID da unidade (salon) na Bemp — resolvemos o nome pela API.
    let unitName = `Unidade vinculada ID ${unidadeId}`;
    try {
      const cfg = await getBempConfig();
      const salons = (await bempFetch(`${cfg.apiBase}/salons`)) as any;
      const list = Array.isArray(salons) ? salons : (salons?.data ?? salons?.salons ?? []);
      const found = Array.isArray(list)
        ? list.find((s: any) => String(s?.id) === String(unidadeId))
        : null;
      if (found?.name || found?.nome) unitName = String(found.name || found.nome);
    } catch {
      // nome indisponível: mantemos o rótulo por ID (unidade continua fixa)
    }


    const messagesArray = Array.isArray(historyData?.messages) ? historyData.messages : [];
    const seenIds = new Set<string>();
    const historyMessages: UIMessage[] = [];
    
    for (const m of messagesArray) {
      if (m.id && !seenIds.has(m.id)) {
        seenIds.add(m.id);
        const text = Array.isArray(m.parts) ? m.parts.map((p: any) => p.text).join(" ").trim() : String(m.parts || "").trim();
        if (text.length > 0) {
          historyMessages.push({
            id: m.id,
            role: m.role,
            parts: Array.isArray(m.parts) ? m.parts : [{ type: "text", text: String(m.parts || "") }],
          } as any);
        }
      }
    }

    await logEvent({
      instance,
      messageId,
      event: "ai_context_prepared",
      status: "success",
      payload: {
        traceId: "",
        contactNameAvailable: !!pushName || !!historyData?.contact_name,
        contactPhoneAvailable: !!phone,
        unitAvailable: !!unidadeId,
        historyCount: historyMessages.length,
        currentMessageAvailable: !!params.text
      }
    });

    await logEvent({ instance, messageId, event: "ai_request_started", status: "started" });

    // Injetar mensagem atual se não estiver no histórico
    if (!historyMessages.find(m => m.id === messageId)) {
      historyMessages.push({ 
        id: messageId, 
        role: "user", 
        parts: [{ type: "text", text: params.text }]
      } as any);
    }

    // Determinar a unidade operacional efetiva: unidade da conversa (se transferida) ou do agente.
    const { effectiveUnitId, effectiveUnitName, source: unitSource } = await resolveEffectiveUnit({ 
      conversationKey, 
      agentUnitId: unidadeId 
    });

    const currentUnitName = effectiveUnitName || unitName;

    // 8. NORMALIZAR A INTENÇÃO (Requisito 8)
    const normalizeIntentText = (t: string) => {
      return t.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // remove pontuação
        .replace(/\s+/g, " ")
        .trim();
    };

    const normalizedText = normalizeIntentText(params.text || "");
    const currentCustomerContext = {
      ...(historyData?.customer_context || {})
    };

    const subscriptionKeywords = [
      "tenho plano", "tenho plano beauty", "sou assinante", "quero usar meu plano",
      "quero usar meu beneficio", "tenho assinatura", "plano de manicure",
      "plano de escova", "plano de hidratacao", "quero usar minha assinatura",
      "sou cliente do plano", "assinatura", "plano de manicure", "plano de escova", "plano de hidratacao", "plano de beleza", "beneficio"
    ];

    const isSubscriptionIntent = subscriptionKeywords.some(kw => normalizedText.includes(kw));

    // 1. CORRIGIR A INTERCEPTAÇÃO INICIAL (Requisito 1 & 2)
    if (isSubscriptionIntent && !currentCustomerContext.subscriptionPhoneValidated && currentCustomerContext.subscriptionLookupStage !== "LOOKING_UP_PHONE") {
      logger.info("SUBSCRIPTION_INTENT_DETECTED", `Intenção de assinatura detectada`);
      
      const patch = {
        subscriptionIntent: true,
        subscriptionLookupMethod: "PHONE",
        subscriptionLookupStage: "AWAITING_REGISTERED_PHONE",
        subscriptionPhoneValidated: false,
        subscriptionPhoneAttempts: 0,
        ...LEGACY_CPF_CONTEXT_RESET,
      };
      
      await patchCustomerContext(conversationKey, patch);
      // Atualiza contexto local
      Object.assign(currentCustomerContext, patch);

      const phoneRequest = SUBSCRIPTION_MESSAGES.ASK_PHONE;
      logger.info("SUBSCRIPTION_PHONE_REQUESTED", `Solicitando telefone para validação de plano`);
      
      const { replyToUser } = await import("./evolution/reply.server");
      await replyToUser({
        instance,
        phone,
        text: phoneRequest,
        conversationKey,
        messageId
      });
      
      await logEvent({
        instance,
        messageId,
        event: "subscription_phone_requested",
        status: "success",
        payload: { }
      });
      return;
    }

    // 4. PROCESSAR O TELEFONE DETERMINISTICAMENTE (Requisito 4 & 5)
    if (currentCustomerContext.subscriptionLookupStage === "AWAITING_REGISTERED_PHONE" || currentCustomerContext.subscriptionLookupStage === "AWAITING_REGISTERED_PHONE_RETRY") {
       const { normalizeBrazilianPhone } = await import("@/lib/phone");
       const normalizedPhone = normalizeBrazilianPhone(params.text);

       if (normalizedPhone) {
          logger.info("SUBSCRIPTION_PHONE_RECEIVED", `Telefone recebido para validação`, { phoneLast4: normalizedPhone.full.slice(-4) });
          logger.info("SUBSCRIPTION_PHONE_LOOKUP_STARTED", `Iniciando consulta de telefone no BEMP`);
         
         await patchCustomerContext(conversationKey, {
           subscriptionLookupStage: "LOOKING_UP_PHONE"
         });
         currentCustomerContext.subscriptionLookupStage = "LOOKING_UP_PHONE";

         const { validateSubscriptionByPhone } = await import("@/lib/bemp/phone-validation.server");
         const result = await validateSubscriptionByPhone(normalizedPhone.full);
         const { replyToUser } = await import("./evolution/reply.server");

         if (result.success && result.customer) {
           const patch = {
             subscriptionPhoneValidated: true,
             subscriptionPhoneLast4: result.customer.phoneMasked.slice(-4),
             bempCustomerId: result.customer.id,
             subscriptionCheckedAt: new Date().toISOString(),
             subscriptionLookupStage: "PLAN_FOUND"
           };
           await patchCustomerContext(conversationKey, patch);
           Object.assign(currentCustomerContext, patch);
           
           // Agora que validou, deixa seguir para a IA para continuar o agendamento (conforme Requisito 5)
          } else {
            const attempts = (currentCustomerContext.subscriptionPhoneAttempts || 0) + 1;
            let errorText = "";
            let stage = "";

            const technicalFailure = isBempTechnicalError(result.code);
            if (technicalFailure) {
              // Falha técnica NUNCA vira "plano não encontrado" e não consome tentativa.
              errorText = SUBSCRIPTION_MESSAGES.TECHNICAL_HANDOFF;
              stage = "HUMAN_HANDOFF";
            } else if (technicalFailure) {
              errorText = SUBSCRIPTION_MESSAGES.TECHNICAL_HANDOFF;
              stage = "HUMAN_HANDOFF";
            } else if (attempts >= SUBSCRIPTION_MAX_PHONE_ATTEMPTS) {
              errorText = SUBSCRIPTION_MESSAGES.HUMAN_HANDOFF;
              stage = "HUMAN_HANDOFF";
            } else {
              errorText = SUBSCRIPTION_MESSAGES.RETRY_PHONE;
              stage = "AWAITING_REGISTERED_PHONE_RETRY";
            }

            logger.info("SUBSCRIPTION_PHONE_LOOKUP_COMPLETED", `Consulta de telefone de assinatura concluída`, { code: result.code, stage, phoneAttempts: attempts, phoneLast4: normalizedPhone.full.slice(-4) });
            await logEvent({
              instance,
              messageId,
              event: technicalFailure ? "subscription_phone_lookup_completed" : "subscription_phone_not_found",
              status: technicalFailure ? "failed" : "not_found",
              payload: { lookupStage: stage, phoneAttempts: attempts, phoneLast4: normalizedPhone.full.slice(-4) },
            });

            const patch = {
              subscriptionLookupStage: stage,
              subscriptionPhoneAttempts: technicalFailure ? (currentCustomerContext.subscriptionPhoneAttempts || 0) : attempts,
              subscriptionCheckedAt: new Date().toISOString()
            };

            if (stage === "HUMAN_HANDOFF") {
               // Trigger human handoff
               const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
               await supabaseAdmin.from("wa_conversas").update({
                 attendance_mode: 'HUMAN',
                 ai_pause_reason: "SUBSCRIPTION_NOT_FOUND_BY_PHONE"
               } as any).eq("phone", conversationKey);
            }

            await patchCustomerContext(conversationKey, patch);
            
            await replyToUser({
              instance,
              phone,
              text: errorText,
              conversationKey,
              messageId
            });
            return;
          }
       } else if (normalizedText.replace(/\D/g, "").length >= 10) {
          // Se parece um telefone mas falhou na normalização
          const { replyToUser } = await import("./evolution/reply.server");
          await replyToUser({
            instance,
            phone,
            text: SUBSCRIPTION_MESSAGES.INVALID_PHONE,
            conversationKey,
            messageId
          });
          return;
       }
    }



    // 10. RECUPERAR ESTADOS PRESOS (Requisito 10)
    if (currentCustomerContext.subscriptionLookupStage === "LOOKING_UP_PHONE") {
      const lastUpdate = currentCustomerContext.subscriptionCheckedAt ? new Date(currentCustomerContext.subscriptionCheckedAt).getTime() : 0;
      const now = Date.now();
      const twoMinutes = 2 * 60 * 1000;

      if (now - lastUpdate > twoMinutes) {
        logger.warn("SUBSCRIPTION_PHONE_LOOKUP_RECOVERED", `Recuperando estado de consulta de telefone preso`);
        const patch = {
          subscriptionLookupStage: "AWAITING_REGISTERED_PHONE",
          subscriptionCheckedAt: new Date().toISOString()
        };
        await patchCustomerContext(conversationKey, patch);
        Object.assign(currentCustomerContext, patch);

        const { replyToUser } = await import("./evolution/reply.server");
        await replyToUser({
          instance,
          phone,
          text: "Houve uma pequena demora na minha consulta. Pode me enviar o seu telefone cadastrado novamente com o DDD, por favor? 💜",
          conversationKey,
          messageId
        });
        return;
      } else {
        // Se ainda está processando e não expirou, informa o cliente ou silencia
        const { replyToUser } = await import("./evolution/reply.server");
        await replyToUser({
          instance,
          phone,
          text: "Estou terminando de consultar sua assinatura, um momentinho só... ✨",
          conversationKey,
          messageId
        });
        return;
      }
    }

    // CARREGAMENTO UNCONDICIONAL DE PROMOÇÕES (Correção Requisito Promoção)
    try {
      const promoResult = await PromotionService.getActivePromotions({
        unitId: effectiveUnitId || undefined,
        channel: "WHATSAPP"
      });

      if (promoResult.success) {
        activePromotions = promoResult.promotions;
        
        // Se houver intenção de mechas, identificamos a promoção mandatória para injeção
        const intent = detectServiceCategory(params.text);
        if (intent?.category === "MECHAS" || params.text.toLowerCase().includes("mecha")) {
          const mechasPromo = activePromotions.find(p => p.code === 'PACOTE_MECHAS_MENSAL');
          if (mechasPromo) {
            mandatoryPromo = mechasPromo;
            logger.info("PROMOTION_SELECTED", `Promoção de mechas identificada por intenção`, { 
              promo: mechasPromo.code,
              traceId: effectiveTraceId
            });
          }
        }
      }
    } catch (err) {
      logger.error("PROMOTION_LOAD_FAILED", `Erro crítico ao carregar promoções`, { error: err, traceId: effectiveTraceId });
    }

    // Memória permanente do cliente (aprendizado contínuo) — nunca bloqueia o atendimento.
    const { loadMemoryForAgent } = await import("./memory/pipeline.server");
    const { promptBlock: memoryBlock } = await loadMemoryForAgent({
      phone,
      instance,
      contactName: pushName || (historyData?.contact_name as string) || null,
    });

    const agentResult = await runAgent(historyMessages, {
      unidadeId: effectiveUnitId || undefined,
      unitName: currentUnitName || undefined,
      contactName: pushName || (historyData?.contact_name as string),
      contactPhone: phone,
      customerContext: currentCustomerContext || {},
      conversationKey,
      messageId,
      memoryBlock,
      activePromotions: activePromotions,
    });

    let reply = agentResult;

    // Validação determinística da promoção na resposta
    if (mandatoryPromo && !(historyData?.customer_context as any)?.mechasPromotionPresented) {
      const validatedReply = ensureMandatoryPromotionMessage(reply, {
        title: mandatoryPromo.title,
        price: mandatoryPromo.promotional_price
      });
      
      if (validatedReply !== reply) {
        logger.info("PROMOTION_INJECTED", `Promoção injetada na resposta final [${effectiveTraceId}]`, { promo: mandatoryPromo.code });
        reply = validatedReply;
      }

      await patchCustomerContext(conversationKey, {
        mechasPromotionPresented: true,
        promotionCode: mandatoryPromo.code,
        promotionPresentedAt: new Date().toISOString()
      });
    }

    if (!reply || reply.trim().length === 0) {
      await logEvent({ instance, messageId, event: "ai_empty_response", status: "failed" });
      const { handleAIFallback } = await import("./evolution/fallback.server");
      await handleAIFallback({
        instance,
        phone,
        conversationKey,
        messageId,
        contactName: pushName || (historyData?.contact_name as string) || null,
        reason: "resposta vazia da IA",
      });
      return;
    }

    // PROTEÇÃO DE SAÍDA #1 (pós-orquestrador): nunca mencionar CPF no fluxo de assinatura.
    const { enforceNoCpfInSubscriptionFlow } = await import("@/lib/subscription-policy.server");
    const cpfGuard = enforceNoCpfInSubscriptionFlow(reply, currentCustomerContext as never);
    if (cpfGuard.blocked) {
      console.log(`[chat] subscription_cpf_output_blocked: traceId=${effectiveTraceId}, lookupStage=${currentCustomerContext.subscriptionLookupStage || "NONE"}, phoneAttempts=${currentCustomerContext.subscriptionPhoneAttempts || 0}`);
      reply = cpfGuard.text;
    }

    // AUDITORIA CRÍTICA DE CPF NA SAÍDA
    if (reply.includes("CPF")) {
      console.warn(`[AUDIT] CPF_RESPONSE_GENERATED traceId=${effectiveTraceId} file=chat.server.ts function=orchestrateChat text="${reply.slice(0, 100)}..."`);
    }

    await logEvent({ instance, messageId, event: "ai_request_completed", status: "success" });

    const { replyToUser } = await import("./evolution/reply.server");
    await replyToUser({
      instance,
      phone,
      text: reply,
      conversationKey,
      messageId,
      traceId: effectiveTraceId
    });

    // CRM: Update stage after successfully replying
    await updateCustomerPipeline({
      phone,
      stage: 'IDENTIFYING_SERVICE',
      customerName: pushName || (historyData?.contact_name as string) || undefined
    }).catch(e => console.error("[crm] Post-reply update failed:", e));


    // Aprendizado contínuo: extrai e mescla a memória depois da resposta enviada.
    try {
      const { learnFromInteraction } = await import("./memory/pipeline.server");
      await learnFromInteraction({
        phone,
        instance,
        conversationKey,
        contactName: pushName || (historyData?.contact_name as string) || null,
        newMessage: text,
        assistantReply: reply,
        recentHistory: historyMessages.slice(-8).map((m: any) => ({
          role: String(m.role),
          text: Array.isArray(m.parts) ? m.parts.map((p: any) => p?.text ?? "").join(" ") : "",
        })),
        customerContext: (historyData?.customer_context as Record<string, unknown>) || {},
      });
    } catch (memErr) {
      console.warn("[memory] pós-processamento ignorado:", memErr);
    }



  } catch (error) {
    const info = describeError(error);
    const failure = classifyFailure(error);
    console.error(
      `[chat] ai_request_failed: conversationKey=${conversationKey}, unitId=${unidadeId}, code=${failure.code}, name=${info.name}, message=${info.message}`,
    );
    if (info.stack) console.error(`[chat] ai_request_failed_stack:\n${info.stack}`);
    await logEvent({
      instance,
      messageId,
      event: "ai_request_failed",
      status: "error",
      errorDetail: info.message,
      payload: {
        failureCode: failure.code,
        expected: failure.expected,
        errorName: info.name,
        errorStatus: info.status ?? null,
        errorCode: info.code ?? null,
        stack: info.stack,
      },
    });

    const { handleAIFallback } = await import("./evolution/fallback.server");
    await handleAIFallback({
      instance,
      phone,
      conversationKey,
      messageId,
      contactName: pushName || null,
      reason: info.message,
      error,
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
- Plano de assinatura: ${ctx.subscriptionPlanName || "não identificado"}
- Serviço do benefício: ${ctx.subscriptionServiceName || "não resolvido"}${ctx.subscriptionServiceId ? ` (id ${ctx.subscriptionServiceId})` : ""}
${subscriptionContextLine(ctx as Record<string, any>)}
- Subscription Lookup Stage: ${ctx.subscriptionLookupStage || "NONE"}
- Subscription Intent: ${ctx.subscriptionIntent === true ? "YES" : "NO"}
`.trim();
  }

  const basePrompt = await loadSystemPrompt({
    contactName: opts.contactName || undefined,
    contactPhone: opts.contactPhone || undefined,
    unitName: opts.unitName || undefined,
    customerContext: opts.customerContext,
    activePromotions: opts.activePromotions
  });

  const { effectiveUnitId, effectiveUnitName, source } = await resolveEffectiveUnit({ 
    conversationKey: opts.conversationKey || undefined, 
    agentUnitId: opts.unidadeId 
  });

  const currentUnitName = effectiveUnitName || opts.unitName;

  // Promoções já passadas via opts.activePromotions em loadSystemPrompt
  const promotionBlock = "";

  let fullSystem = assembleSystemPrompt(basePrompt, {
    contactName: opts.contactName,
    contactPhone: opts.contactPhone,
    unitName: currentUnitName,
    unidadeId: effectiveUnitId,
    contextSummary,
  });

  fullSystem = fullSystem + 
               currentDateNote() + 
               LANGUAGE_GUARD + 
               NO_DURATION_GUARD + 
               unitContext + 
               contactInfo + 
               promotionBlock +
               (sandbox ? SANDBOX_NOTE : "") + 
               (opts.persona ? `\n\n${opts.persona}` : "") +
               mandatoryOperationalRules({
                 unidadeId: effectiveUnitId,
                 unitName: currentUnitName,
                 contactName: opts.contactName,
                 contactPhone: opts.contactPhone,
                 hasHistory: uiMessages.length > 1,
               }) +
               (opts.memoryBlock ? opts.memoryBlock : "") +
               `\n\nUNIDADE ATUAL DA CONVERSA (PRIORIDADE ABSOLUTA):\n- Unidade operacional: ${currentUnitName || "não definida"}\n- ID: ${effectiveUnitId}\n- Origem: ${source === "conversation" ? "Transferência ativa" : "Padrão do canal"}\n- NUNCA pergunte a unidade se ela já estiver definida acima.`;

  const result = await generateText({
    model: getModel(),
    system: fullSystem,
    messages: await convertToModelMessages(sanitizeMessagesForModel(uiMessages)),
    // A tool de CPF não é instanciada nem registrada em buildTools (política: somente telefone).
    tools: buildTools(sandbox, effectiveUnitId, opts.conversationKey || undefined, opts.messageId ?? null),

    stopWhen: stepCountIs(5),
    abortSignal: AbortSignal.timeout(60000),
  });

  logger.audit("IA_RAW_RESPONSE", `Resposta bruta gerada pelo modelo`, {
    text: result.text,
    finishReason: result.finishReason
  });

  return sanitizeCustomerText(result.text?.trim() || "Desculpe, tive um probleminha aqui. Pode repetir?");
}


