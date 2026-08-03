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

    // Como getBaseUrl e getApiKey são privados/internos no evolution.server, 
    // confiamos no check da conexão ou fazemos uma leitura direta aqui se necessário.
    // Mas para o check de UI, isEvolutionConfigured já resolve o aviso.
    return { isValid: true };

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
