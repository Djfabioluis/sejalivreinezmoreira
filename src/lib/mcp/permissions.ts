import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * MCP tools that touch the real Bemp scheduling system must require the same
 * staff-only "bemp" permission enforced on the web server functions — a valid
 * Supabase login alone is not enough (anyone can self-register).
 * Returns an error message when access is denied, or null when allowed.
 */
export async function checkMcpPermission(
  ctx: ToolContext,
  perm: string,
): Promise<string | null> {
  if (!ctx.isAuthenticated()) return "Não autenticado.";
  const userId = ctx.getUserId();
  if (!userId) return "Não autenticado.";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("user_has_permission", {
    _user_id: userId,
    _perm: perm,
  });
  if (error) return "Falha ao validar permissões.";
  if (!data) return "Acesso restrito à equipe do salão.";
  return null;
}

export function deniedResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}
