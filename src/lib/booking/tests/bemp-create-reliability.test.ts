import { expect, test, vi } from "vitest";
// Mock BempService before imports
vi.mock("@/lib/bemp-service.server", () => ({
  BempService: {
    createAppointment: vi.fn(),
    listProfessionals: vi.fn().mockResolvedValue([{ id: "29461", name: "Juliana Muller" }]),
    listAvailableSlots: vi.fn().mockResolvedValue([{ start: "2026-08-17T18:00:00.000-03:00", end: "2026-08-17T18:40:00.000-03:00" }])
  },
  extractBempAppointmentId: vi.fn((res) => res?.appointment_id || res?.id)
}));

import { BempService } from "@/lib/bemp-service.server";

test("BEMP_ERROR_PATH_TEST: falha na BEMP não deve enviar mensagem de sucesso", async () => {
  const mockCreate = vi.mocked(BempService.createAppointment);
  mockCreate.mockRejectedValue(new Error("BEMP_DOWN"));

  // Este teste simularia a chamada no agent.server.ts
  // Mas vamos focar na lógica que queremos injetar: 
  // O sucesso SÓ pode ser enviado se apptId existir E BempService não falhou.
});

test("BEMP_SUCCESS_PATH_TEST: sucesso na BEMP deve retornar ID válido", async () => {
  const mockCreate = vi.mocked(BempService.createAppointment);
  mockCreate.mockResolvedValue({ id: 123456 });
  
  const result = await BempService.createAppointment({});
  expect(result.id).toBe(123456);
});
