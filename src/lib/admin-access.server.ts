import { hasAnyAdmin, hasRole } from "@/lib/roles";

export async function assertAdminAccess(ctx: { supabase: any; userId: string }) {
  const anyAdmin = await hasAnyAdmin();
  if (!anyAdmin) return;
  const isAdmin = await hasRole(ctx.userId, "admin");
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}