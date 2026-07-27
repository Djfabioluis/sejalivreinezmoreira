import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBempSettingsSafe, saveSettingsToDb, bempFetch } from "@/lib/bemp.server";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: anyAdmin } = await ctx.supabase.rpc("has_any_admin");
  if (!anyAdmin) return;
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const getBempSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return await getBempSettingsSafe();
  });

export const saveBempSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dominio: z
          .string()
          .trim()
          .min(1, "Domínio obrigatório")
          .max(120)
          .regex(/^[a-zA-Z0-9-]+$/, "Use apenas letras, números e hífen (ex.: sejalivrebyinezmoreira)"),
        token: z.string().trim().min(10, "Token muito curto").max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await saveSettingsToDb({ dominio: data.dominio, token: data.token });
    return { ok: true };
  });

export const testBempConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    try {
      const { getBempConfig } = await import("@/lib/bemp.server");
      const cfg = await getBempConfig();
      const data = await bempFetch(`${cfg.apiBase}/salons`);
      const count = Array.isArray(data) ? data.length : 0;
      return { ok: true, salonsCount: count };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
