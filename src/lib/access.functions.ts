import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AppRole = "admin" | "operador";

export type AccessUser = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
};

async function assertAdminOrBootstrap(ctx: { supabase: any; userId: string }) {
  const { data: anyAdmin, error: adminErr } = await ctx.supabase.rpc("has_any_admin");
  if (adminErr) throw new Error(adminErr.message);
  if (!anyAdmin) return; // bootstrap: nenhum admin ainda -> permitir
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const listAccessUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: AccessUser[]; needsBootstrap: boolean; me: string }> => {
    const { data: anyAdmin } = await context.supabase.rpc("has_any_admin");
    const needsBootstrap = !anyAdmin;

    if (!needsBootstrap) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) {
        return { users: [], needsBootstrap: false, me: context.userId };
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) throw new Error(usersErr.message);

    const { data: rolesRows, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw new Error(rolesErr.message);

    const rolesByUser = new Map<string, AppRole[]>();
    for (const r of rolesRows ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByUser.set(r.user_id, arr);
    }

    const users: AccessUser[] = usersData.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      name:
        (u.user_metadata?.name as string) ??
        (u.user_metadata?.full_name as string) ??
        null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: rolesByUser.get(u.id) ?? [],
    }));

    users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return { users, needsBootstrap, me: context.userId };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "operador"]),
        enabled: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrBootstrap(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      // Impedir remoção do último admin
      if (data.role === "admin") {
        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) <= 1) {
          throw new Error("Não é possível remover o último administrador.");
        }
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
