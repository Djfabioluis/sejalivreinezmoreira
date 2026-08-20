import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = {
  assistant_response_status: string | null;
  processing_started_at: string | null;
};

const row: Row = { assistant_response_status: null, processing_started_at: null };

vi.mock("@/integrations/supabase/client.server", () => {
  const builder = (patch: any) => {
    const state: any = { orConditions: null as string[] | null, requireStatus: undefined as string | undefined, staleBefore: null as string | null };
    const api: any = {
      match(m: any) {
        if (m.assistant_response_status) state.requireStatus = m.assistant_response_status;
        return api;
      },
      or(filter: string) {
        state.orConditions = filter.split(",").map((s: string) => s.trim());
        return api;
      },
      lt(_col: string, value: string) {
        state.staleBefore = value;
        return api;
      },
      select() {
        let ok = true;
        if (state.orConditions) {
          ok = state.orConditions.some((cond: string) => {
            const [, op, val] = cond.split(".");
            const status = row.assistant_response_status;
            if (op === "is") return status === null;
            if (op === "eq") return status === val;
            return false;
          });
        }
        if (state.requireStatus) ok = row.assistant_response_status === state.requireStatus;
        if (ok && state.staleBefore) {
          ok = !!row.processing_started_at && row.processing_started_at < state.staleBefore;
        }
        if (ok) Object.assign(row, patch);
        return Promise.resolve({ data: ok ? [{ id: "1" }] : [], error: null });
      },
      then(resolve: any) {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return api;
  };

  return {
    supabaseAdmin: {
      from: () => ({
        update: (patch: any) => builder(patch),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

vi.mock("@/lib/evolution/logger.server", () => ({ logEvent: vi.fn() }));

import { claimResponseSlot, markResponseFailed, markResponseSent, SENDING_STALE_MS } from "@/lib/evolution/idempotency.server";

describe("Outbound slot state machine", () => {
  beforeEach(() => {
    row.assistant_response_status = "pending";
    row.processing_started_at = null;
  });

  it("primeiro claim é permitido e marca sending", async () => {
    expect(await claimResponseSlot("inst", "m1")).toBe(true);
    expect(row.assistant_response_status).toBe("sending");
  });

  it("status NULL permite claim e marca sending", async () => {
    row.assistant_response_status = null;
    expect(await claimResponseSlot("inst", "m1")).toBe(true);
    expect(row.assistant_response_status).toBe("sending");
  });

  it("envio concorrente (sending recente) é bloqueado", async () => {
    await claimResponseSlot("inst", "m1");
    expect(await claimResponseSlot("inst", "m1")).toBe(false);
  });

  it("falha marca failed e libera retry", async () => {
    await claimResponseSlot("inst", "m1");
    await markResponseFailed("inst", "m1", "timeout");
    row.assistant_response_status = "failed";
    expect(await claimResponseSlot("inst", "m1")).toBe(true);
  });

  it("sending antigo expirado permite novo claim", async () => {
    row.assistant_response_status = "sending";
    row.processing_started_at = new Date(Date.now() - SENDING_STALE_MS - 5000).toISOString();
    expect(await claimResponseSlot("inst", "m1")).toBe(true);
  });

  it("após sent, novo envio é bloqueado", async () => {
    await claimResponseSlot("inst", "m1");
    await markResponseSent("inst", "m1");
    row.assistant_response_status = "sent";
    expect(await claimResponseSlot("inst", "m1")).toBe(false);
  });
});
