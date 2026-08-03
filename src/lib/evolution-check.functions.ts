import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkEvolutionConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const url = process.env.EVOLUTION_API_URL || "";
    const key = process.env.EVOLUTION_API_KEY || "";

    if (!url || !key) {
      return {
        isValid: false,
        error: "EVOLUTION_API_URL ou EVOLUTION_API_KEY não configuradas.",
      };
    }

    if (!url.startsWith("https://")) {
      return {
        isValid: false,
        error: "A URL da Evolution API deve obrigatoriamente usar HTTPS para segurança.",
      };
    }

    try {
      new URL(url);
    } catch {
      return {
        isValid: false,
        error: "A URL da Evolution API é inválida.",
      };
    }

    return { isValid: true };
  });
