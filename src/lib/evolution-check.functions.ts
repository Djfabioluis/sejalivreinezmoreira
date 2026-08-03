import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkEvolutionConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Importamos os helpers dinamicamente para evitar problemas de bundle se necessário
    const { isEvolutionConfigured } = await import("./evolution.server");
    const isConfigured = await isEvolutionConfigured();

    if (!isConfigured) {
      return {
        isValid: false,
        error: "Evolution API não configurada. Vá em 'Config Evolution' no painel.",
      };
    }

    return { isValid: true };
  });
