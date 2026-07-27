import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminAccess } from "@/lib/admin-access.server";
import {
  getUltraMsgSettingsSafe,
  saveUltraMsgSettingsToDb,
  pingUltraMsg,
  configureUltraMsgWebhook,
  type UltraMsgSettings,
} from "@/lib/ultramsg.server";

export const getUltraMsgSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminAccess(context);
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
        origin: z.string().trim().url().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    const settings: UltraMsgSettings = {
      instanceId: data.instanceId,
      token: data.token,
      webhookToken: data.webhookToken,
    };
    await saveUltraMsgSettingsToDb(settings);
    const webhook = data.origin ? await configureUltraMsgWebhook(data.origin) : null;
    return { ok: true, webhook };
  });

export const testUltraMsgConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminAccess(context);
    return await pingUltraMsg();
  });

export const syncUltraMsgWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        origin: z.string().trim().url().max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    return await configureUltraMsgWebhook(data.origin);
  });
