// Server-only helpers for role/admin checks.
// Cache results to improve performance and avoid redundant RPC calls.

const ROLE_CACHE = new Map<string, { role: string; expires: number }>();
const CACHE_TTL = 10_000; // 10 seconds

export async function hasAnyAdmin(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_any_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function hasRole(
  userId: string,
  role: "admin" | "operador" = "admin",
): Promise<boolean> {
  if (!userId) return false;

  const cacheKey = `${userId}:${role}`;
  const cached = ROLE_CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return true;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: role,
  });
  if (error) throw new Error(error.message);

  const result = Boolean(data);
  if (result) {
    ROLE_CACHE.set(cacheKey, { role, expires: Date.now() + CACHE_TTL });
  }

  return result;
}
