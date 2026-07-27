import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getUltraMsgSettingsSafe,
  saveUltraMsgSettingsToDb,
  pingUltraMsg,
  type UltraMsgSettings,
} from "@/lib/ultramsg.server";

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

export const getUltraMsgSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return await getUltraMsgSettingsSafe();
  });

export const saveUltraMsgSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        instanceId: z
          .string()
          .trim()
          .min(3, "Instance ID obrigatório")
          .max(120)
          .regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, hífen ou underscore"),
        token: z.string().trim().min(10, "Token muito curto").max(400),
        webhookToken: z.string().trim().min(6, "Webhook token muito curto").max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const settings: UltraMsgSettings = {
      instanceId: data.instanceId,
      token: data.token,
      webhookToken: data.webhookToken,
    };
    await saveUltraMsgSettingsToDb(settings);
    return { ok: true };
  });

export const testUltraMsgConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return await pingUltraMsg();
  });
