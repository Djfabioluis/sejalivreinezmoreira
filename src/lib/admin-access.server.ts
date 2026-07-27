import { hasAnyAdmin } from "@/lib/roles";

export async function assertAdminAccess(ctx: { supabase: any; userId: string }) {
  const anyAdmin = await hasAnyAdmin();
  if (!anyAdmin) return;
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}