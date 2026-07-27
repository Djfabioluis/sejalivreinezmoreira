// Server-only helpers for role/admin checks that used to be reached through
// SECURITY DEFINER functions callable by the authenticated role. Now executed
// via the admin client so the underlying functions can be locked down.

export async function hasAnyAdmin(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_any_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
}
