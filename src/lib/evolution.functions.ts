import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getConnectionState, getQrCode, getEvolutionConfig } from "./evolution.server";
import { hasRole } from "./roles";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const isAdmin = await hasRole(ctx.userId, "admin");
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const getEvolutionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { url } = await getEvolutionConfig();
    const instance = "julia-main"; // Instância padrão ou extraída da config
    const state = await getConnectionState(instance);
    
    let qrcode = null;
    if (state !== "conectado") {
      qrcode = await getQrCode(instance);
    }

    return {
      instance,
      state,
      qrcode,
      apiUrl: url
    };
  });
