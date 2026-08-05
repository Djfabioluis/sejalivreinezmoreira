import { describe, it, expect, vi, beforeEach } from "vitest";

const services = [
  { id: 115, name: "Pedicure", active: true, duration: 60, price: 50 },
  { id: 116, name: "Manicure", active: true },
  { id: 117, name: "Design de Sobrancelha", active: true }, // sem profissional
];

const prosByService: Record<string, any[]> = {
  "115": [{ id: 1, name: "Ana", active: true }, { id: 2, name: "Carla", active: true }],
  "116": [{ id: 1, name: "Ana", active: true }],
  "117": [],
};

vi.mock("@/lib/bemp.server", () => ({
  getBempConfig: async () => ({ apiBase: "https://x/api" }),
  bempFetch: async (url: string) => {
    const m = url.match(/services\/(\d+)\/professionals$/);
    if (m) return prosByService[m[1]!] ?? [];
    if (url.endsWith("/services")) return services;
    return [];
  },
}));

const mod = await import("@/lib/bemp/assignments.server");

describe("bemp assignments", () => {
  beforeEach(() => mod.invalidateAssignmentsCache());

  it("Teste 1 — serviço sem profissional não é apresentado", async () => {
    const list = await mod.getAvailableServiceAssignments(10);
    expect(list.map((s) => s.name)).toEqual(["Pedicure", "Manicure"]);
  });

  it("Teste 2/3 — só profissionais atribuídos ao serviço", async () => {
    const pros = await mod.getProfessionalsForService(10, 116);
    expect(pros.map((p) => p.name)).toEqual(["Ana"]);
    const pedicure = await mod.getProfessionalsForService(10, 115);
    expect(pedicure.map((p) => p.name)).toEqual(["Ana", "Carla"]);
  });

  it("Teste 4 — serviços do profissional escolhido", async () => {
    const svcs = await mod.getServicesForProfessional(10, 2);
    expect(svcs.map((s) => s.name)).toEqual(["Pedicure"]);
  });

  it("Teste 6 — combinação inválida é bloqueada", async () => {
    const bad = await mod.validateProfessionalServiceAssignment({ unitId: 10, professionalId: 2, serviceId: 116 });
    expect(bad).toEqual({ valid: false, code: "professional_not_assigned_to_service" });
    const ok = await mod.validateProfessionalServiceAssignment({ unitId: 10, professionalId: 1, serviceId: 116 });
    expect(ok.valid).toBe(true);
  });

  it("resolve serviço por nome sem acento/caixa", async () => {
    const svc = await mod.resolveServiceAssignment(10, "pedicure");
    expect(svc?.id).toBe(115);
    expect(await mod.resolveServiceAssignment(10, "Design de Sobrancelha")).toBeNull();
  });
});

describe("computeProfessionalSelection", () => {
  it("0 profissionais: sem auto-seleção e sem 'Sem preferência'", async () => {
    const { computeProfessionalSelection } = await import("../assignments.server");
    const r = computeProfessionalSelection([]);
    expect(r.professionalsCount).toBe(0);
    expect(r.autoSelectProfessional).toBe(false);
  });

  it("1 profissional: auto-seleção", async () => {
    const { computeProfessionalSelection } = await import("../assignments.server");
    const r = computeProfessionalSelection([{ id: 1, name: "Gleise Cibela" }]);
    expect(r.professionalsCount).toBe(1);
    expect(r.autoSelectProfessional).toBe(true);
    expect(r.professionals[0]!.name).toBe("Gleise Cibela");
  });

  it("2 profissionais: cliente escolhe", async () => {
    const { computeProfessionalSelection } = await import("../assignments.server");
    const r = computeProfessionalSelection([
      { id: 1, name: "Gleise Cibela" },
      { id: 2, name: "Mariana Souza" },
    ]);
    expect(r.professionalsCount).toBe(2);
    expect(r.autoSelectProfessional).toBe(false);
  });

  it("'Sem preferência' nunca conta como profissional", async () => {
    const { computeProfessionalSelection } = await import("../assignments.server");
    const r = computeProfessionalSelection([
      { id: 1, name: "Gleise Cibela" },
      { id: 999, name: "Sem preferência" },
    ]);
    expect(r.professionalsCount).toBe(1);
    expect(r.autoSelectProfessional).toBe(true);
  });
});
