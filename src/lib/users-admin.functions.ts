import { hasAnyAdmin, hasRole } from "@/lib/roles";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdminOrBootstrap(ctx: { supabase: any; userId: string }) {
  const anyAdmin = await hasAnyAdmin(); const adminErr = null as any;
  if (adminErr) throw new Error(adminErr.message);
  if (!anyAdmin) return;
  const isAdmin = await hasRole(ctx.userId, "admin");
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8, "Senha deve ter ao menos 8 caracteres."),
        name: z.string().trim().max(120).optional(),
        role: z.enum(["admin", "operador"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrBootstrap(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: data.name ? { name: data.name } : undefined,
    });
    if (error) throw new Error(error.message);

    if (data.role && created.user) {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: created.user.id, role: data.role },
          { onConflict: "user_id,role" },
        );
      if (roleErr) throw new Error(roleErr.message);

      try {
        const actorEmail = (context.claims as any)?.email ?? null;
        await supabaseAdmin.from("access_audit_log").insert({
          actor_id: context.userId,
          actor_email: actorEmail,
          target_user_id: created.user.id,
          target_email: created.user.email ?? null,
          role: data.role,
          action: "granted",
        });
      } catch (e) {
        console.error("[users-admin] audit failed", e);
      }
    }

    return { ok: true, id: created.user?.id };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrBootstrap(context);
    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir a própria conta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Impedir remoção do último admin
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const isTargetAdmin = (targetRoles ?? []).some((r: any) => r.role === "admin");
    if (isTargetAdmin) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("Não é possível excluir o último administrador.");
      }
    }

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const targetEmail = target?.user?.email ?? null;

    const { error: rolesErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (rolesErr) {
      console.error("[deleteAppUser] user_roles delete failed", rolesErr);
      throw new Error(`Falha ao remover papéis: ${rolesErr.message}`);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) {
      console.error("[deleteAppUser] auth.admin.deleteUser failed", {
        userId: data.userId,
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
      });
      throw new Error(`Falha ao excluir usuário: ${error.message}`);
    }

    try {
      const actorEmail = (context.claims as any)?.email ?? null;
      await supabaseAdmin.from("access_audit_log").insert({
        actor_id: context.userId,
        actor_email: actorEmail,
        target_user_id: data.userId,
        target_email: targetEmail,
        role: "admin",
        action: "revoked",
      });
    } catch (e) {
      console.error("[users-admin] audit failed", e);
    }

    return { ok: true };
  });
