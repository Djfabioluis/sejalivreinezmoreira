import { hasAnyAdmin } from "@/lib/roles";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getWhatsAppSettingsSafe,
  saveWhatsAppSettingsToDb,
  getWhatsAppConfig,
  type WhatsAppSettings,
} from "@/lib/whatsapp-config.server";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const anyAdmin = await hasAnyAdmin();
  if (!anyAdmin) return;
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const getWhatsAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return await getWhatsAppSettingsSafe();
  });

export const saveWhatsAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        accessToken: z.string().trim().min(20, "Access Token muito curto").max(800),
        phoneNumberId: z.string().trim().min(5, "Phone Number ID obrigatório").max(120),
        appSecret: z.string().trim().min(10, "App Secret muito curto").max(800),
        verifyToken: z.string().trim().min(4, "Verify Token obrigatório").max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const settings: WhatsAppSettings = {
      accessToken: data.accessToken,
      phoneNumberId: data.phoneNumberId,
      appSecret: data.appSecret,
      verifyToken: data.verifyToken,
    };
    await saveWhatsAppSettingsToDb(settings);
    return { ok: true };
  });

export const testWhatsAppConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    try {
      const cfg = await getWhatsAppConfig();
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${cfg.phoneNumberId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${cfg.accessToken}` } },
      );
      const data = (await res.json()) as {
        display_phone_number?: string;
        verified_name?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          ok: false,
          error: data.error?.message ?? `Meta respondeu ${res.status}`,
        };
      }
      const raw = data.display_phone_number ?? "";
      const digits = raw.replace(/\D/g, "");
      return {
        ok: true,
        formatted: raw,
        verifiedName: data.verified_name ?? "",
        digits,
        link: digits ? `https://wa.me/${digits}` : "",
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
