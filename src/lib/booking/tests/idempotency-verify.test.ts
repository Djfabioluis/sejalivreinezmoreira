import { describe, expect, it, vi } from "vitest";

/**
 * Regra: uma chave de idempotência existente NÃO prova agendamento.
 * Só há confirmação de booking anterior se o ID for verificado no BEMP.
 */
describe("idempotência exige verificação real no BEMP", () => {
  async function loadService(listImpl: (p: any) => Promise<any[]>) {
    const mod = await import("@/lib/bemp-service.server");
    vi.spyOn(mod.BempService, "listCustomerAppointments").mockImplementation(listImpl as any);
    return mod.BempService;
  }

  const phone = {
    phone_country_code: "55",
    phone_area_code: "41",
    phone_number: "999102791",
  };

  it("sem appointmentId → não verificado", async () => {
    const svc = await loadService(async () => [{ id: 1 }]);
    expect(await svc.verifyAppointmentExists({ appointmentId: null, ...phone })).toBe(false);
    expect(await svc.verifyAppointmentExists({ appointmentId: "  ", ...phone })).toBe(false);
  });

  it("appointmentId inexistente no BEMP → não verificado", async () => {
    const svc = await loadService(async () => [{ id: 999 }]);
    expect(await svc.verifyAppointmentExists({ appointmentId: "21566339", ...phone })).toBe(false);
  });

  it("appointmentId existente no BEMP → verificado", async () => {
    const svc = await loadService(async () => [{ id: 21566339 }]);
    expect(await svc.verifyAppointmentExists({ appointmentId: "21566339", ...phone })).toBe(true);
  });

  it("falha na consulta BEMP → não verificado", async () => {
    const svc = await loadService(async () => {
      throw new Error("bemp down");
    });
    expect(await svc.verifyAppointmentExists({ appointmentId: "21566339", ...phone })).toBe(false);
  });
});
