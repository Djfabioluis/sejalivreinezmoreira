import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const ALL_PERMISSIONS = [
  "painel",
  "agendar",
  "bemp",
  "base-conhecimento",
  "boas-vindas",
  "operadores",
  "sugestoes",
  "auditoria-sugestoes",
  "integracao-bemp",
  "acessos",
  "usuarios",
  "assinantes",
  "permissoes",
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export async function assertPermission(
  ctx: { supabase: any; userId: string },
  perm: PermissionKey,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("user_has_permission", {
    _user_id: ctx.userId,
    _perm: perm,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Você não tem permissão para esta ação.");
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Emulate get_my_permissoes() using admin client, scoped to the caller.
    if (isAdmin) {
      return {
        isAdmin: true,
        permissions: [...ALL_PERMISSIONS] as string[],
      };
    }
    const { data: own, error: ownErr } = await supabaseAdmin
      .from("operador_permissoes")
      .select("permissoes")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (ownErr) throw new Error(ownErr.message);
    let permissions: string[] | null = (own?.permissoes as string[] | undefined) ?? null;
    if (!permissions) {
      const { data: def } = await supabaseAdmin
        .from("operador_permissoes_default")
        .select("permissoes")
        .eq("id", 1)
        .maybeSingle();
      permissions = (def?.permissoes as string[] | undefined) ?? [];
    }
    return {
      isAdmin: false,
      permissions,
    };
  });

export const listOperadorPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw new Error(rolesErr.message);

    const operadorIds = Array.from(
      new Set(
        (roles ?? [])
          .filter((r: any) => r.role === "operador")
          .map((r: any) => r.user_id as string),
      ),
    );

    const { data: perms, error: permsErr } = await supabaseAdmin
      .from("operador_permissoes")
      .select("user_id, permissoes, updated_at");
    if (permsErr) throw new Error(permsErr.message);

    const { data: def } = await supabaseAdmin
      .from("operador_permissoes_default")
      .select("permissoes")
      .eq("id", 1)
      .maybeSingle();

    const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const users = list.data?.users ?? [];
    const byId = new Map(users.map((u: any) => [u.id, u]));

    const permMap = new Map<string, { permissoes: string[]; updated_at: string | null }>(
      (perms ?? []).map((p: any) => [p.user_id, { permissoes: p.permissoes, updated_at: p.updated_at }]),
    );

    return {
      defaults: (def?.permissoes as string[]) ?? [],
      operadores: operadorIds.map((id) => {
        const u: any = byId.get(id);
        const p = permMap.get(id);
        return {
          user_id: id,
          email: u?.email ?? null,
          name: (u?.user_metadata?.name as string | undefined) ?? null,
          permissoes: p?.permissoes ?? null,
          updated_at: p?.updated_at ?? null,
        };
      }),
    };
  });

export const saveOperadorPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        permissoes: z.array(z.enum(ALL_PERMISSIONS)).max(ALL_PERMISSIONS.length),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("operador_permissoes")
      .upsert(
        { user_id: data.userId, permissoes: data.permissoes, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveDefaultPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ permissoes: z.array(z.enum(ALL_PERMISSIONS)) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("operador_permissoes_default")
      .upsert({ id: 1, permissoes: data.permissoes, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
