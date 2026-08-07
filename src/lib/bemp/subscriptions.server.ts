// Server-only: regras de agendamento para clientes com plano de assinatura no BEMP.
// Mapeamento centralizado plano -> serviço. Nunca importar em componentes de frontend.
import { bempFetch, BEMP_WEBHOOK_BASE } from "@/lib/bemp.server";
import { resolveServiceAssignment } from "@/lib/bemp/assignments.server";
import { normalizeCPF, maskCPF } from "@/lib/cpf";
import { SUBSCRIPTION_PRIMARY_LOOKUP } from "@/lib/subscription-policy.server";


export type SubscriptionPlanType = "manicure" | "escova" | "hidratacao_escova";

/** ÚNICA fonte de verdade do mapeamento plano -> serviço do BEMP. */
export const SUBSCRIPTION_SERVICE_MAP: Record<SubscriptionPlanType, { serviceName: string }> = {
  manicure: { serviceName: "Manicure Plano Beauty" },
  escova: { serviceName: "Escova Plano Beauty" },
  hidratacao_escova: { serviceName: "Hidratação e Escova" },
};

/** lowercase + sem acentos + sem espaços duplicados + sem ruído ("plano de", "beauty"...). */
export function normalizeSubscriptionPlanName(planName: unknown): string {
  return String(planName ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta o tipo do plano a partir do nome livre retornado pelo BEMP. */
export function detectSubscriptionPlanType(planName: unknown): SubscriptionPlanType | null {
  const n = normalizeSubscriptionPlanName(planName);
  if (!n) return null;
  const hasHidratacao = /\bhidrat/.test(n);
  const hasEscova = /\bescova/.test(n);
  const hasManicure = /\bmanicure\b|\bmao\b|\bunha/.test(n);

  if (hasHidratacao && hasEscova) return "hidratacao_escova";
  if (hasEscova) return "escova";
  if (hasManicure) return "manicure";
  return null;
}

export function subscriptionServiceNameForPlan(planName: unknown): string | null {
  const type = detectSubscriptionPlanType(planName);
  return type ? SUBSCRIPTION_SERVICE_MAP[type].serviceName : null;
}

function log(event: string, extra: Record<string, unknown> = {}) {
  const parts = Object.entries(extra)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ");
  console.log(`[bemp-plan] ${event}${parts ? `: ${parts}` : ""}`);
}

function asArray(raw: any, depth = 0): any[] {
  if (depth > 5) return [];
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  for (const key of [
    "data",
    "subscriptions",
    "plans",
    "subscription_plans",
    "customer_plans",
    "assinaturas",
    "planos",
    "results",
    "items",
  ]) {
    if (raw[key]) {
      const found = asArray(raw[key], depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
}

const ACTIVE_STATUSES = ["active", "ativo", "vigente"];
const INACTIVE_STATUSES = ["inactive", "inativo", "canceled", "cancelled", "cancelado", "expired", "vencid", "vencido", "suspended", "suspenso", "bloqueado"];
const INACTIVE_REGEX = new RegExp(`(${INACTIVE_STATUSES.join("|")})`, "i");

function readStatus(raw: any): string {
  return String(raw?.status ?? raw?.situacao ?? raw?.state ?? raw?.subscription_status ?? "").trim().toLowerCase();
}

function readValidUntil(raw: any): string | null {
  const v =
    raw?.valid_until ??
    raw?.validUntil ??
    raw?.expires_at ??
    raw?.end_date ??
    raw?.due_date ??
    raw?.validade ??
    raw?.data_fim ??
    null;
  return v ? String(v) : null;
}

function readAvailableUses(raw: any): number | null {
  const v =
    raw?.available_uses ??
    raw?.remaining_uses ??
    raw?.remaining ??
    raw?.balance ??
    raw?.saldo ??
    raw?.usos_disponiveis ??
    raw?.uses_left ??
    null;
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function readPlanName(raw: any): string {
  return String(
    raw?.plan_name ??
      raw?.name ??
      raw?.nome ??
      raw?.plan?.name ??
      raw?.subscription_plan?.name ??
      raw?.title ??
      "",
  ).trim();
}

export type CustomerPlan = {
  id: string | number | null;
  name: string;
  planType: SubscriptionPlanType | null;
  serviceName: string | null;
  status: string;
  validUntil: string | null;
  availableUses: number | null;
  active: boolean;
  inactiveReason: "canceled_or_suspended" | "expired" | "no_balance" | null;
};

function evaluatePlan(raw: any): CustomerPlan {
  const name = readPlanName(raw);
  const status = readStatus(raw);
  const validUntil = readValidUntil(raw);
  const availableUses = readAvailableUses(raw);
  const planType = detectSubscriptionPlanType(name);

  let inactiveReason: CustomerPlan["inactiveReason"] = null;
  
  // Regra de Status: precisa ser explicitamente ativo ou não estar na lista de inativos
  const isExplicitlyActive = ACTIVE_STATUSES.includes(status);
  const isExplicitlyInactive = INACTIVE_REGEX.test(status);

  if (isExplicitlyInactive) {
    inactiveReason = "canceled_or_suspended";
  } else if (!isExplicitlyActive && status !== "") {
    // Se tem status mas não é ativo nem inativo conhecido, tratamos como suspeito
    // mas deixamos passar se não houver outros bloqueios por enquanto para manter compatibilidade,
    // EXCEÇÃO: se o status for explicitamente de bloqueio/pendência.
    if (/(bloquead|pendente|overdue|suspens)/i.test(status)) {
      inactiveReason = "canceled_or_suspended";
    }
  }

  if (!inactiveReason && validUntil) {
    const ts = Date.parse(validUntil);
    if (Number.isFinite(ts) && ts < Date.now()) inactiveReason = "expired";
  }

  // Se o saldo for 0, está inativo por falta de saldo
  if (!inactiveReason && availableUses !== null && availableUses <= 0) {
    inactiveReason = "no_balance";
  }

  return {
    id: raw?.id ?? raw?.subscription_id ?? raw?.plan_id ?? null,
    name,
    planType,
    serviceName: planType ? SUBSCRIPTION_SERVICE_MAP[planType].serviceName : null,
    status: status || "desconhecido",
    validUntil,
    availableUses,
    active: inactiveReason === null && (status === "" || isExplicitlyActive || !isExplicitlyInactive),
    inactiveReason,
  };
}

/** Consulta o cadastro do cliente no BEMP e extrai os planos, ativos e inativos. */
export async function getCustomerActivePlans(params: {
  phoneCountry: string;
  phoneArea: string;
  phoneNumber: string;
}): Promise<{
  success: boolean;
  found: boolean;
  plans: CustomerPlan[];
  inactivePlans: CustomerPlan[];
  message?: string;
}> {
  log("subscription_lookup_started");
  
  const { getPhoneVariants, normalizeBrazilianPhone } = await import("@/lib/phone");
  const normalized = normalizeBrazilianPhone(`${params.phoneCountry}${params.phoneArea}${params.phoneNumber}`);
  const variants = normalized ? getPhoneVariants(normalized) : [{ countryCode: params.phoneCountry, areaCode: params.phoneArea, number: params.phoneNumber, full: `${params.phoneCountry}${params.phoneArea}${params.phoneNumber}` }];

  let lastError: any = null;
  for (const variant of variants) {
    const qs = new URLSearchParams({
      phone_country_code: variant.countryCode,
      phone_area_code: variant.areaCode,
      phone_number: variant.number,
    });

    try {
      const customer: any = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_customer?${qs.toString()}`);
      const container = customer?.customer && typeof customer.customer === "object" ? customer.customer : customer;
      const { plans, inactivePlans, evaluated } = extractPlansFromCustomer(container);

      if (evaluated.length > 0) {
        log("subscription_lookup_completed", { ok: true, active: plans.length, inactive: inactivePlans.length, variant: variant.full });
        return { success: true, found: true, plans, inactivePlans };
      }
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (!/404|not\s*found|não encontrado/i.test(message)) {
        log("subscription_lookup_error", { variant: variant.full, error: message });
      }
    }
  }

  if (lastError) {
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    if (/404|not\s*found|não encontrado/i.test(message)) {
      log("subscription_plan_not_found", { reason: "customer_not_found" });
      return { success: true, found: false, plans: [], inactivePlans: [], message: "Cliente não cadastrado no BEMP." };
    }
    throw lastError;
  }

  log("subscription_plan_not_found");
  return { success: true, found: false, plans: [], inactivePlans: [] };
}

/** Extrai e avalia os planos a partir do payload do cliente no BEMP. */
export function extractPlansFromCustomer(container: any): {
  plans: CustomerPlan[];
  inactivePlans: CustomerPlan[];
  evaluated: CustomerPlan[];
} {
  let rawPlans = asArray(container);
  if (rawPlans.length === 0) {
    for (const key of ["subscription", "active_subscription", "plan", "subscription_plan"]) {
      const single = container?.[key];
      if (single && typeof single === "object" && !Array.isArray(single)) {
        rawPlans = [single];
        break;
      }
    }
  }
  const evaluated = rawPlans.map(evaluatePlan).filter((p) => p.name.length > 0);
  return {
    plans: evaluated.filter((p) => p.active),
    inactivePlans: evaluated.filter((p) => !p.active),
    evaluated,
  };
}

export type CustomerByCPFResult =
  | { success: true; found: false; reason: "customer_not_found"; message: string }
  | {
      success: true;
      found: true;
      customerId: string | number | null;
      customerName: string | null;
      unitId: string | number | null;
      plans: CustomerPlan[];
      inactivePlans: CustomerPlan[];
    };

/**
 * Consulta o cadastro do cliente no BEMP pelo CPF. SEM CACHE — sempre consulta ao vivo.
 * O CPF nunca é logado em texto completo.
 */
export async function getCustomerByCPF(cpfInput: string): Promise<CustomerByCPFResult> {
  // BLOQUEIO GLOBAL: Este método não deve ser usado no atendimento WhatsApp.
  log("cpf_lookup_blocked_globally");
  return {
    success: true,
    found: false,
    reason: "customer_not_found",
    message: "A busca por CPF está desativada. Por favor, utilize o telefone cadastrado.",
  };
}


/**
 * Resolve o serviço do plano na unidade EFETIVA da conversa.
 * Nunca usa IDs fixos: o ID é sempre buscado na unidade atual pelo nome do serviço.
 */
export async function resolveSubscriptionService(params: {
  planName: string;
  effectiveUnitId: string | number;
}): Promise<
  | { success: true; planType: SubscriptionPlanType; serviceId: string | number; serviceName: string }
  | { success: false; code: "plan_not_mapped" | "service_not_found" | "service_ambiguous"; planType: SubscriptionPlanType | null; serviceName: string | null; options?: Array<{ id: string | number; name: string }> }
> {
  log("subscription_service_resolution_started", { unit: String(params.effectiveUnitId) });
  const planType = detectSubscriptionPlanType(params.planName);
  if (!planType) {
    log("subscription_service_not_found", { reason: "plan_not_mapped" });
    return { success: false, code: "plan_not_mapped", planType: null, serviceName: null };
  }

  const serviceName = SUBSCRIPTION_SERVICE_MAP[planType].serviceName;
  const resolved = await resolveServiceAssignment(params.effectiveUnitId, serviceName);

  if (!resolved.success || !("service" in resolved) || !resolved.service) {
    log("subscription_service_not_found", { planType, unit: String(params.effectiveUnitId) });
    return {
      success: false,
      code: (resolved as any).code === "service_ambiguous" ? "service_ambiguous" : "service_not_found",
      planType,
      serviceName,
      options: (resolved as any).options,
    };
  }

  log("subscription_service_resolved", { planType, serviceName });
  return {
    success: true,
    planType,
    serviceId: resolved.service.id,
    serviceName: resolved.service.name,
  };
}

/** Chave idempotente do agendamento de plano. */
export function subscriptionAppointmentKey(parts: {
  conversationKey?: string | null;
  messageId?: string | null;
  planId?: string | number | null;
  serviceId: string | number;
  start: string;
}): string {
  return [
    parts.conversationKey ?? "no-conv",
    parts.messageId ?? "no-msg",
    parts.planId ?? "no-plan",
    parts.serviceId,
    parts.start,
  ].join("|");
}

const recentSubscriptionAppointments = new Map<string, { at: number; result: unknown }>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

/** Retorna o resultado anterior quando a mesma confirmação já foi processada. */
export function getIdempotentSubscriptionResult(key: string): unknown | null {
  const hit = recentSubscriptionAppointments.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > IDEMPOTENCY_TTL_MS) {
    recentSubscriptionAppointments.delete(key);
    return null;
  }
  return hit.result;
}

export function rememberSubscriptionResult(key: string, result: unknown) {
  recentSubscriptionAppointments.set(key, { at: Date.now(), result });
  if (recentSubscriptionAppointments.size > 500) {
    const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
    for (const [k, v] of recentSubscriptionAppointments) if (v.at < cutoff) recentSubscriptionAppointments.delete(k);
  }
}

export function clearSubscriptionIdempotencyCache() {
  recentSubscriptionAppointments.clear();
}
