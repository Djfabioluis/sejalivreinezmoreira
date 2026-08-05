// Server-only: fonte oficial de atribuições profissional x serviço no BEMP.
// Nunca importar em componentes de frontend.
import { bempFetch, getBempConfig } from "@/lib/bemp.server";

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

function asArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  return raw.data ?? raw.services ?? raw.professionals ?? raw.results ?? raw.items ?? [];
}

function isActive(entity: any): boolean {
  const flag = entity?.active ?? entity?.ativo ?? entity?.is_active ?? entity?.enabled ?? entity?.status;
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
      const pros = asArray(
        await bempFetch(`${cfg.apiBase}/salons/${key}/services/${service.id}/professionals`),
      );
      return { service, pros };
    }),
  );

  const seen = new Set<string>();
  const assignments: BempProfessionalServiceAssignment[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    const { service, pros } = r.value;
    for (const pro of pros) {
      if (pro?.id == null || !isActive(pro)) continue;
      const professionalName = nameOf(pro);
      const serviceName = nameOf(service);
      if (!professionalName || !serviceName) continue;
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
  const exact = services.find((s) => normalizeName(s.name) === target);
  if (exact) return exact;
  const partial = services.filter((s) => {
    const n = normalizeName(s.name);
    return n.includes(target) || target.includes(n);
  });
  if (partial.length === 1) return partial[0]!;
  return null;
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
