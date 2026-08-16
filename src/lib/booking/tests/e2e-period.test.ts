import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgent } from "../chat.server";
import { BempService } from "./bemp-service.server";

vi.mock("./bemp-service.server", () => ({
  BempService: {
    listSalons: vi.fn().mockResolvedValue([{ id: "5258", name: "Ventura" }]),
    listServices: vi.fn().mockResolvedValue([{ id: "1", name: "Manicure", price: 50 }]),
    listAvailableSlots: vi.fn().mockResolvedValue([
      { start: "14:00", end: "15:00" },
      { start: "15:00", end: "16:00" }
    ])
  }
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { unidade_id: "5258" } }),
    update: vi.fn().mockReturnThis()
  }
}));

describe("End-to-End Period to List Slots Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect period and trigger list_slots without repeating question", async () => {
    const bookingContext = {
      unitId: "5258",
      serviceId: "1",
      serviceName: "Manicure",
      date: "2026-08-16",
      period: null,
      time: null,
      selectedSlot: null
    };

    const response = await runAgent({
      conversationKey: "5541999999999",
      unidadeId: "5258",
      text: "a tarde",
      bookingContext,
      sandbox: true,
      traceId: "test-trace"
    });

    expect(response.content).toContain("Encontrei estes horários para tarde");
    expect(response.content).toContain("14:00");
    expect(response.content).not.toContain("Você prefere manhã, tarde ou noite");
    expect(BempService.listAvailableSlots).toHaveBeenCalled();
  });
});
