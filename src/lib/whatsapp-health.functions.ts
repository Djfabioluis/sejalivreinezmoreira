import { hasAnyAdmin, hasRole } from "@/lib/roles";
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
  const isAdmin = await hasRole(ctx.userId, "admin");
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
