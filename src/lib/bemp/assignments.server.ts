// Server-only: fonte oficial de atribuições profissional x serviço no BEMP.
// Nunca importar em componentes de frontend.
import { bempFetch, getBempConfig } from "@/lib/bemp.server";
import { sanitizeErrorText } from "@/lib/evolution/failure";

export type BempProfessionalServiceAssignment = {
  unitId: string | number;
  unitName?: string;
  professionalId: string | number;
  professionalName: string;
  professionalActive: boolean;
  serviceId: string | number;
  serviceName: string;
  serviceActive: boolean;
  durationMinutes?: number | null;
  price?: number | null;
};

const TTL_MS = 120_000; // 2 minutos
const cache = new Map<string, { at: number; value: BempProfessionalServiceAssignment[] }>();

export function normalizeName(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function maskId(id: unknown): string {
  const s = String(id ?? "");
  if (s.length <= 3) return "***";
  return `${s.slice(0, 2)}***${s.slice(-1)}`;
}

function asArray(raw: any, depth = 0): any[] {
  if (depth > 5) return [];
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const keys = ["data", "services", "professionals", "results", "items", "result"];
  for (const key of keys) {
    if (raw[key]) {
      const found = asArray(raw[key], depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function isActive(entity: any): boolean {
  const flag = entity?.active ?? entity?.ativo ?? entity?.is_active ?? entity?.enabled ?? entity?.status ?? entity?.available ?? entity?.availability ?? entity?.assignment_active;
  if (flag === undefined || flag === null) return true;
  if (typeof flag === "string") return !/inativ|disabled|false|^0$/i.test(flag.trim());
  return Boolean(flag);
}

function nameOf(entity: any): string {
  return String(entity?.name ?? entity?.nome ?? entity?.title ?? entity?.full_name ?? "").trim();
}

function durationOf(service: any): number | null {
  const d = service?.duration_minutes ?? service?.duration ?? service?.duracao ?? service?.minutes;
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function priceOf(service: any): number | null {
  const p = service?.price ?? service?.valor ?? service?.preco ?? service?.amount;
  const n = Number(p);
  return Number.isFinite(n) ? n : null;
}
/**
 * Regra única de seleção de profissional:
 * 0 → sem auto-seleção; 1 → auto-seleção; 2+ → cliente escolhe (aí sim "Sem preferência").
 * "Sem preferência" NUNCA conta como profissional.
 */
export function computeProfessionalSelection<T extends { id: string | number; name: string }>(
  raw: T[] | null | undefined,
): {
  professionals: T[];
  professionalsCount: number;
  autoSelectProfessional: boolean;
  autoSelect: boolean;
  askPreference: boolean;
  includeNoPreference: boolean;
  selectedProfessional: T | null;
} {
  const validProfessionals = (raw ?? []).filter(
    (p) => p?.id != null && !!p?.name && !/^sem\s+prefer/i.test(String(p.name).trim()),
  );
  const count = validProfessionals.length;
  const autoSelect = count === 1;

  return {
    professionals: validProfessionals,
    professionalsCount: count,
    autoSelectProfessional: autoSelect,
    autoSelect,
    askPreference: count >= 2,
    includeNoPreference: count >= 2,
    selectedProfessional: autoSelect ? (validProfessionals[0] ?? null) : null,
  };
}


export function invalidateAssignmentsCache(unitId?: string | number) {
  if (unitId === undefined || unitId === null) {
    cache.clear();
    return;
  }
  cache.delete(String(unitId));
}

/**
 * Atribuições reais: para cada serviço ativo da unidade, o BEMP expõe
 * /salons/:salon_id/services/:service_id/professionals — essa é a relação oficial.
 */
export async function getUnitProfessionalAssignments(
  unitId: string | number,
): Promise<BempProfessionalServiceAssignment[]> {
  const key = String(unitId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    console.log(`[bemp] assignment_cache_hit: unit=${maskId(key)}, assignments=${hit.value.length}`);
    return hit.value;
  }
  console.log(`[bemp] assignment_cache_miss: unit=${maskId(key)}`);
  console.log(`[bemp] bemp_assignments_query_started: unit=${maskId(key)}`);

  const cfg = await getBempConfig();
  const services = asArray(await bempFetch(`${cfg.apiBase}/salons/${key}/services`)).filter(
    (s) => s?.id != null && isActive(s),
  );

  const results = await Promise.allSettled(
    services.map(async (service) => {
      const url = `${cfg.apiBase}/salons/${key}/services/${service.id}/professionals`;
      try {
        const pros = asArray(await bempFetch(url));
        return { service, pros };
      } catch (err: any) {
        console.error(`[bemp] professionals_endpoint_failed: unit=${maskId(key)}, service=${maskId(service.id)}, status=${err?.status ?? "n/a"}, message=${sanitizeErrorText(err?.message ?? "unknown", 100)}`);
        throw err;
      }
    }),
  );

  const seen = new Set<string>();
  const assignments: BempProfessionalServiceAssignment[] = [];
  let totalFulfilled = 0;
  let totalRejected = 0;

  for (const r of results) {
    if (r.status !== "fulfilled") {
      totalRejected++;
      continue;
    }
    totalFulfilled++;
    const { service, pros } = r.value;
    
    // Log formato da resposta (amostra)
    if (pros.length > 0) {
       const first = pros[0];
       console.log(`[bemp] professionals_response_shape: unit=${maskId(key)}, keys=${Object.keys(first).join(",")}, items=${pros.length}, dataType=${typeof pros}`);
    }

    for (const pro of pros) {
      if (pro?.id == null || !isActive(pro)) continue;
      
      // Validação defensiva (item 8 e 11)
      const professionalName = nameOf(pro);
      const serviceName = nameOf(service);
      if (!professionalName || !serviceName) continue;
      
      // Confirmar vínculo à unidade se o campo existir
      const proUnitId = pro.salon_id ?? pro.unit_id ?? pro.salonId ?? pro.unitId;
      if (proUnitId !== undefined && String(proUnitId) !== String(key)) {
        console.warn(`[bemp] professional_unit_mismatch: pro=${pro.id}, expected=${key}, got=${proUnitId}`);
        continue;
      } else if (proUnitId === undefined) {
        // console.log(`[bemp] professional_unit_not_verifiable: pro=${pro.id}`);
      }

      const dedupe = `${key}|${pro.id}|${service.id}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      assignments.push({
        unitId: key,
        professionalId: pro.id,
        professionalName,
        professionalActive: true,
        serviceId: service.id,
        serviceName,
        serviceActive: true,
        durationMinutes: durationOf(service),
        price: priceOf(service),
      });
    }
  }

  if (totalFulfilled === 0 && totalRejected > 0) {
    console.error(`[bemp] professionals_api_failed: all services failed for unit=${maskId(key)}`);
    throw new Error("Falha total na integração de profissionais do BEMP.");
  }

  console.log(
    `[bemp] bemp_assignments_query_completed: unit=${maskId(key)}, assignments=${assignments.length}, services=${
      new Set(assignments.map((a) => String(a.serviceId))).size
    }, professionals=${new Set(assignments.map((a) => String(a.professionalId))).size}`,
  );

  cache.set(key, { at: Date.now(), value: assignments });
  return assignments;
}

export async function getAvailableServiceAssignments(unitId: string | number) {
  const all = await getUnitProfessionalAssignments(unitId);
  const byService = new Map<
    string,
    { id: string | number; name: string; durationMinutes?: number | null; price?: number | null; professionalsCount: number }
  >();
  for (const a of all) {
    const k = String(a.serviceId);
    const entry = byService.get(k);
    if (entry) entry.professionalsCount += 1;
    else
      byService.set(k, {
        id: a.serviceId,
        name: a.serviceName,
        durationMinutes: a.durationMinutes ?? null,
        price: a.price ?? null,
        professionalsCount: 1,
      });
  }
  const services = [...byService.values()].filter((s) => s.professionalsCount > 0);
  console.log(`[bemp] assigned_services_resolved: unit=${maskId(unitId)}, services=${services.length}`);
  return services;
}

export async function getProfessionalsForService(unitId: string | number, serviceId: string | number) {
  const all = await getUnitProfessionalAssignments(unitId);
  const seen = new Set<string>();
  const professionals = all
    .filter((a) => String(a.serviceId) === String(serviceId))
    .filter((a) => {
      const k = String(a.professionalId);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((a) => ({ id: a.professionalId, name: a.professionalName }));
  console.log(
    `[bemp] assigned_professionals_resolved: unit=${maskId(unitId)}, service=${maskId(serviceId)}, professionals=${professionals.length}`,
  );
  return professionals;
}

export async function getServicesForProfessional(unitId: string | number, professionalId: string | number) {
  const all = await getUnitProfessionalAssignments(unitId);
  const seen = new Set<string>();
  return all
    .filter((a) => String(a.professionalId) === String(professionalId))
    .filter((a) => {
      const k = String(a.serviceId);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((a) => ({
      id: a.serviceId,
      name: a.serviceName,
      durationMinutes: a.durationMinutes ?? null,
      price: a.price ?? null,
    }));
}

export async function resolveProfessionalByName(unitId: string | number, professionalName: string) {
  const all = await getUnitProfessionalAssignments(unitId);
  const target = normalizeName(professionalName);
  const uniq = new Map<string, { id: string | number; name: string }>();
  for (const a of all) uniq.set(String(a.professionalId), { id: a.professionalId, name: a.professionalName });
  const list = [...uniq.values()];
  const exact = list.find((p) => normalizeName(p.name) === target);
  if (exact) return exact;
  const partial = list.filter((p) => {
    const n = normalizeName(p.name);
    return n.includes(target) || target.includes(n);
  });
  return partial.length === 1 ? partial[0]! : null;
}

/** Resolve o serviço pelo nome, considerando SOMENTE serviços com profissional atribuído na unidade. */
export async function resolveServiceAssignment(unitId: string | number, serviceName: string) {
  const services = await getAvailableServiceAssignments(unitId);
  const target = normalizeName(serviceName);
  
  // 1. Busca exata
  const exact = services.filter((s) => normalizeName(s.name) === target);
  if (exact.length === 1) return { success: true, service: exact[0] };
  if (exact.length > 1) {
    return { success: false, code: "service_ambiguous", options: exact.map(s => ({ id: s.id, name: s.name })) };
  }

  // 2. Busca parcial
  const partial = services.filter((s) => {
    const n = normalizeName(s.name);
    return n.includes(target) || target.includes(n);
  });
  
  if (partial.length === 1) return { success: true, service: partial[0] };
  if (partial.length > 1) {
     console.log(`[bemp] service_ambiguous: target="${serviceName}", matches=${partial.length}`);
     return { success: false, code: "service_ambiguous", options: partial.map(s => ({ id: s.id, name: s.name })) };
  }
  
  return { success: false, code: "service_not_found" };
}

export async function validateProfessionalServiceAssignment(params: {
  unitId: string | number;
  professionalId: string | number;
  serviceId: string | number;
}): Promise<
  | { valid: true; assignment: BempProfessionalServiceAssignment }
  | { valid: false; code: "professional_not_assigned_to_service" }
> {
  const all = await getUnitProfessionalAssignments(params.unitId);
  const assignment = all.find(
    (a) =>
      String(a.serviceId) === String(params.serviceId) &&
      String(a.professionalId) === String(params.professionalId),
  );
  if (assignment) {
    console.log(
      `[bemp] professional_service_assignment_valid: unit=${maskId(params.unitId)}, pro=${maskId(params.professionalId)}, service=${maskId(params.serviceId)}`,
    );
    return { valid: true, assignment };
  }
  console.warn(
    `[bemp] professional_service_assignment_invalid: unit=${maskId(params.unitId)}, pro=${maskId(params.professionalId)}, service=${maskId(params.serviceId)}`,
  );
  return { valid: false, code: "professional_not_assigned_to_service" };
}
