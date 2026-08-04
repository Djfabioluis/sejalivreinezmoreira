import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";

/**
 * MCP tools that touch the real Bemp scheduling system must require the same
 * staff-only "bemp" permission enforced on the web server functions — a valid
 * Supabase login alone is not enough (anyone can self-register).
 */
export async function assertMcpPermission(ctx: ToolContext, perm: string): Promise<void> {
  if (!ctx.isAuthenticated()) {
    throw new ToolError("Não autenticado.");
  }
  const userId = ctx.getUserId();
  if (!userId) {
    throw new ToolError("Não autenticado.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("user_has_permission", {
    _user_id: userId,
    _perm: perm,
  });
  if (error) throw new ToolError("Falha ao validar permissões.");
  if (!data) throw new ToolError("Acesso restrito à equipe do salão.");
}
