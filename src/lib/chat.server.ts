// Server-only. Shared AI-agent runner for /api/chat (web) and /api/public/whatsapp.
import { convertToModelMessages, streamText, generateText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { sanitizeCustomerText } from "@/lib/text-sanitize";
import { logEvent } from "./evolution/logger.server";
import { classifyFailure, describeError, sanitizeErrorText } from "./evolution/failure";

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
- NUNCA ofereça troca de unidade nem interprete menção a outras unidades como mudança operacional.
- NÃO reinicie o atendimento a cada mensagem. Se o cliente disser "Olá", responda com uma saudação breve e prossiga de onde pararam.
- NÃO repita perguntas já respondidas. Consulte o "ESTADO ATUAL" e o "HISTÓRICO".
- Faça apenas uma pergunta por vez, focando no próximo passo necessário para o agendamento.
- Use um tom caloroso, mas profissional. Emojis com moderação.
- list_units_info pode ser usada apenas para informação consultiva (endereço, telefone). Após informar sobre outras unidades, reforce que o agendamento neste canal é para a unidade vinculada.

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

type ToolCtx = { conversationKey?: string; effectiveUnitId?: string | null };

/**
 * Executa uma tool com logs estruturados (tool_started / tool_completed / tool_failed).
 * Nunca propaga exceção: devolve retorno estruturado { success:false, code, message }.
 */
function runTool<T>(label: string, fn: () => Promise<T>, ctx: ToolCtx = {}) {
  const startedAt = Date.now();
  const base = `tool=${label}, conversationKey=${ctx.conversationKey ?? "n/a"}, effectiveUnitId=${ctx.effectiveUnitId ?? "n/a"}`;
  console.log(`[chat] tool_started: ${base}`);
  return fn()
    .then((result) => {
      console.log(`[chat] tool_completed: ${base}, executionTimeMs=${Date.now() - startedAt}`);
      return result;
    })
    .catch((err) => {
      const info = describeError(err);
      const failure = classifyFailure(err);
      console.error(
        `[chat] tool_failed: ${base}, executionTimeMs=${Date.now() - startedAt}, code=${failure.code}, name=${info.name}, message=${info.message}, details=${sanitizeErrorText((err as any)?.details ?? "", 300)}`,
      );
      if (info.stack) console.error(`[chat] tool_failed_stack: tool=${label}\n${info.stack}`);
      return {
        success: false,
        code: failure.code,
        message: failure.userMessage,
        error: info.message,
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

function buildTools(sandbox: boolean, fallbackAgentUnitId?: string | null, conversationKey?: string) {
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
          if (!confirmed) return { success: false, message: "Transferência não confirmada pelo cliente." };
          
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

          // Limpeza de contexto após transferência
          const currentContext = (conv as any).customer_context || {};
          
          const newContext = {
            currentUnitId: target_unit_id,
            requestedService: (typeof currentContext.requestedService === "object" ? currentContext.requestedService?.name || currentContext.requestedService?.nome : currentContext.requestedService) || null,
          };

          // A transferência e a limpeza são atômicas via update_context no RPC ou nesta transação Supabase
          const { error: updateError } = await supabaseAdmin
            .from("wa_conversas")
            .update({ customer_context: newContext })
            .eq("phone", conversationKey);

          if (updateError) {
             console.error(`[transfer] context_reset_failed for ${conversationKey}:`, updateError.message);
             // Se falhar a limpeza, falha a transação (rollback manual)
             throw new Error(`Falha ao resetar contexto: ${updateError.message}`);
          }
          console.log(`[transfer] transfer_completed and context_reset for ${conversationKey}`);

          // Descartar atribuições em cache da unidade anterior e da nova unidade.
          try {
            const { invalidateAssignmentsCache } = await import("@/lib/bemp/assignments.server");
            if ((conv as any).unidade_id) invalidateAssignmentsCache((conv as any).unidade_id);
            invalidateAssignmentsCache(target_unit_id);
            console.log(`[transfer] assignments_cache_invalidated for ${target_unit_id}`);
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
              // Atualizar nome da unidade no contexto também
              await supabaseAdmin
                .from("wa_conversas")
                .update({ customer_context: { ...newContext, currentUnitName: newUnitName } })
                .eq("phone", conversationKey);
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
          const { effectiveUnitId } = await resolveEffectiveUnit({ conversationKey, agentUnitId: fallbackAgentUnitId });
          if (!effectiveUnitId) throw new Error("ID da unidade não resolvido.");

          // Validação obrigatória das atribuições reais no BEMP (unidade + serviço + profissional).
          const { getAvailableServiceAssignments, validateProfessionalServiceAssignment } = await import(
            "@/lib/bemp/assignments.server"
          );
          const availableServices = await getAvailableServiceAssignments(effectiveUnitId);
          const svc = availableServices.find((s) => String(s.id) === String(input.service_id));
          if (!svc) {
            return {
              success: false,
              code: "service_not_available_in_unit",
              message: "Esse serviço não está disponível com profissionais atribuídos nesta unidade.",
            };
          }
          if (input.professional_id != null) {
            const check = await validateProfessionalServiceAssignment({
              unitId: effectiveUnitId,
              professionalId: input.professional_id,
              serviceId: svc.id,
            });
            if (!check.valid) {
              return {
                success: false,
                code: "professional_not_assigned_to_service",
                message: "Esse profissional não realiza esse serviço nesta unidade.",
              };
            }
          }

          const fullInput = { ...input, salon_id: Number(effectiveUnitId), service_id: Number(svc.id) };


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
          // Se o serviço tem apenas um profissional atribuído, não houve escolha real:
          // não registrar a observação "com preferência".
          const { getProfessionalsForService } = await import("@/lib/bemp/assignments.server");
          const assignedPros = await getProfessionalsForService(effectiveUnitId, svc.id);
          const isSoleProfessional = assignedPros.length <= 1;
          const shouldMarkPreference = input.professional_id != null && !isSoleProfessional;

          const payload = shouldMarkPreference
            ? withProfessionalPreferenceNote(fullInput)
            : { ...fullInput };
          const result = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (shouldMarkPreference) {
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
                `${cfg.apiBase}/salons/${effectiveUnitId}/services`,
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
              salon_id: String(effectiveUnitId),
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
  ];


  if (opts.unidadeId) {
    lines.push(
      `- A unidade de atendimento atual é: ${opts.unitName || `Unidade vinculada ID ${opts.unidadeId}`} (ID ${opts.unidadeId}).`,
      "- Se o cliente disser explicitamente que deseja agendar em OUTRA unidade, você deve iniciar o fluxo de transferência descrito nas regras acima.",
      "- Informe que o agendamento por este canal é realizado para a unidade atual, mas que você pode transferir a conversa se ele preferir.",
      "- É PROIBIDO perguntar a unidade no início se já houver uma unidade atual definida.",
    );
  }
  if (opts.contactPhone) lines.push("- É PROIBIDO pedir telefone, DDD ou código de país: já são conhecidos.");
  if (opts.contactName) lines.push("- É PROIBIDO perguntar o nome do cliente: já é conhecido.");
  return lines.join("\n");
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
    if (conteudo && conteudo.length > 0) {
      const flags = detectPromptConflicts(conteudo);
      if (flags.length > 0) {
        await logEvent({
          instance: "system",
          event: "knowledge_prompt_conflict_detected",
          status: "warning",
          payload: { flags },
        }).catch(() => {});
      }
      return conteudo;
    }
    return DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.error("[chat] falha ao carregar base de conhecimento:", err);
    return DEFAULT_SYSTEM_PROMPT;
  }
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
  if (!/\{\{|DADOS CONFIÁVEIS DO ATENDIMENTO/.test(basePrompt)) {
    out += `\n\nDADOS CONFIÁVEIS DO ATENDIMENTO:\nNome do cliente: ${values.contactName}\nTelefone do WhatsApp: ${values.contactPhone}\nUnidade operacional: ${values.unitName}\n\nESTADO ATUAL:\n${values.customer_context_summary}`;
  }
  return out;
}


export type AgentOptions = { 
  sandbox?: boolean; 
  persona?: string; 
  unidadeId?: string | null;
  unitName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  customerContext?: any;
  conversationKey?: string | null;
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

  const { effectiveUnitId, effectiveUnitName, source: unitSource } = await resolveEffectiveUnit({ 
    conversationKey: opts.conversationKey || undefined, 
    agentUnitId: opts.unidadeId 
  });

  const currentUnitName = effectiveUnitName || opts.unitName;

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
           });

  return streamText({
    model: getModel(),
    system,
    messages: await convertToModelMessages(sanitizeMessagesForModel(uiMessages)),
    tools: buildTools(sandbox, effectiveUnitId, opts.conversationKey || undefined),
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
    const historyMessages: UIMessage[] = messagesArray
      .filter((m: any) => {
        const text = Array.isArray(m.parts) ? m.parts.map((p: any) => p.text).join(" ").trim() : String(m.parts || "").trim();
        return text.length > 0;
      })
      .map((m: any) => ({
        id: m.id,
        role: m.role,
        parts: Array.isArray(m.parts) ? m.parts : [{ type: "text", text: String(m.parts || "") }],
      } as any));

    await logEvent({
      instance,
      messageId,
      event: "ai_context_prepared",
      status: "success",
      payload: {
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

    const reply = await runAgent(historyMessages, {
      unidadeId: effectiveUnitId,
      unitName: currentUnitName,
      contactName: pushName || (historyData?.contact_name as string),
      contactPhone: phone,
      customerContext: historyData?.customer_context || {},
      conversationKey
    });

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
`.trim();
  }

  const basePrompt = await loadSystemPrompt();

  const { effectiveUnitId, effectiveUnitName, source } = await resolveEffectiveUnit({ 
    conversationKey: opts.conversationKey || undefined, 
    agentUnitId: opts.unidadeId 
  });

  const currentUnitName = effectiveUnitName || opts.unitName;

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
               (sandbox ? SANDBOX_NOTE : "") + 
               (opts.persona ? `\n\n${opts.persona}` : "") +
               mandatoryOperationalRules({
                 unidadeId: effectiveUnitId,
                 unitName: currentUnitName,
                 contactName: opts.contactName,
                 contactPhone: opts.contactPhone,
                 hasHistory: uiMessages.length > 1,
               }) +
               `\n\nUNIDADE ATUAL DA CONVERSA (PRIORIDADE ABSOLUTA):\n- Unidade operacional: ${currentUnitName || "não definida"}\n- ID: ${effectiveUnitId}\n- Origem: ${source === "conversation" ? "Transferência ativa" : "Padrão do canal"}\n- NUNCA pergunte a unidade se ela já estiver definida acima.`;

  const result = await generateText({
    model: getModel(),
    system: fullSystem,
    messages: await convertToModelMessages(sanitizeMessagesForModel(uiMessages)),
    tools: buildTools(sandbox, effectiveUnitId, opts.conversationKey || undefined),

    stopWhen: stepCountIs(5),
    abortSignal: AbortSignal.timeout(60000),
  });

  return sanitizeCustomerText(result.text?.trim() || "Desculpe, tive um probleminha aqui. Pode repetir?");
}

