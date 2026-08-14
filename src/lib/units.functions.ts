import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBempConfig, bempFetch } from "./bemp.server";

export const getUnitNameMap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const cfg = await getBempConfig();
      const salons = await bempFetch(`${cfg.apiBase}/salons`) as any[];
      
      const map: Record<string, string> = {};
      if (Array.isArray(salons)) {
        salons.forEach(s => {
          if (s.id && s.name) {
            map[String(s.id)] = s.name;
          }
        });
      }
      return map;
    } catch (err) {
      console.error("[getUnitNameMap] Failed to fetch salons:", err);
      return {};
    }
  });
