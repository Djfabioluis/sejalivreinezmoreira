import { hasAnyAdmin } from "@/lib/roles";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  readWhatsAppHealth,
  runWhatsAppHealthCheck,
  type WhatsAppHealth,
} from "@/lib/whatsapp-health.server";

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

export const getWhatsAppHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhatsAppHealth | null> => {
    await assertAdmin(context);
    return await readWhatsAppHealth();
  });

export const refreshWhatsAppHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhatsAppHealth> => {
    await assertAdmin(context);
    return await runWhatsAppHealthCheck();
  });
