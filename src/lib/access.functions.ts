import { hasAnyAdmin, hasRole } from "@/lib/roles";
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
  const anyAdmin = await hasAnyAdmin(); const adminErr = null as any;
  if (adminErr) throw new Error(adminErr.message);
  if (!anyAdmin) return; // bootstrap: nenhum admin ainda -> permitir
  const isAdmin = await hasRole(ctx.userId, "admin");
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const listAccessUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: AccessUser[]; needsBootstrap: boolean; me: string }> => {
    const anyAdmin = await hasAnyAdmin();
    const needsBootstrap = !anyAdmin;

    if (!needsBootstrap) {
      const isAdmin = await hasRole(context.userId, "admin");
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

    // Registrar no log de auditoria (best-effort)
    try {
      const actorEmail = (context.claims as any)?.email ?? null;
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      await supabaseAdmin.from("access_audit_log").insert({
        actor_id: context.userId,
        actor_email: actorEmail,
        target_user_id: data.userId,
        target_email: targetUser?.user?.email ?? null,
        role: data.role,
        action: data.enabled ? "granted" : "revoked",
      });
    } catch (e) {
      console.error("[access-audit] falha ao registrar log", e);
    }

    return { ok: true };
  });

export type AuditEntry = {
  id: string;
  actor_email: string | null;
  target_email: string | null;
  role: AppRole;
  action: "granted" | "revoked";
  created_at: string;
};

export const listAccessAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditEntry[]> => {
    const isAdmin = await hasRole(context.userId, "admin");
    if (!isAdmin) return [];
    const { data, error } = await context.supabase
      .from("access_audit_log")
      .select("id, actor_email, target_email, role, action, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as AuditEntry[];
  });

