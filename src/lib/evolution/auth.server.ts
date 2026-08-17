import { getEvolutionConfig } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
import { logger } from "@/lib/observability/logger.server";

export async function authenticateWebhook(request: Request): Promise<{ authenticated: boolean; error?: string }> {
  const config = await getEvolutionConfig();
  const url = new URL(request.url);
  
  const xSecret = request.headers.get("x-webhook-secret");
  const authHeader = request.headers.get("Authorization");
  const apikeyHeader = request.headers.get("apikey");
  const xApikeyHeader = request.headers.get("x-api-key");
  const querySecret = url.searchParams.get("webhook_secret");
  
  let providedSecret = xSecret || querySecret || "";
  
  if (!providedSecret && authHeader?.startsWith("Bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  }

  const requireSecret = process.env.NODE_ENV === "production" || process.env.EVOLUTION_REQUIRE_WEBHOOK_SECRET === "true";

  // LOG DE AUDITORIA DE CABEÇALHOS (SEGURO - REDIGIDO PELO LOGGER)
  const headerKeys = Array.from(request.headers.keys());
  
  // 1. Caso a variável EVOLUTION_WEBHOOK_SECRET não esteja configurada no ambiente (Comum no Lovable Cloud)
  if (!config.webhookSecret) {
    if (requireSecret) {
      // Fallback: Se o header 'apikey' ou 'x-api-key' estiver presente e for longo o suficiente, confiamos que é a Evolution.
      if ((apikeyHeader && apikeyHeader.length > 5) || (xApikeyHeader && xApikeyHeader.length > 5)) {
        logger.info("WEBHOOK_AUTH_FALLBACK", "EVOLUTION_WEBHOOK_SECRET ausente, autenticado via apikey/x-api-key header.");
        return { authenticated: true };
      }

      logger.error("WEBHOOK_AUTH_FAILED", "EVOLUTION_WEBHOOK_SECRET não configurado e nenhum header de API Key válido detectado.", { 
        url: request.url,
        receivedHeaders: headerKeys
      });
      return { authenticated: false, error: "Unauthorized: Webhook authentication failed (no secret/apikey)" };
    }
    return { authenticated: true };
  }

  // 2. Se o segredo foi enviado e bate com a config, sucesso imediato.
  if (providedSecret && providedSecret === config.webhookSecret) {
    return { authenticated: true };
  }

  // 3. Caso o segredo não tenha sido enviado no local esperado, tentamos validar pelo apikey que a Evolution SEMPRE envia
  if (apikeyHeader && apikeyHeader === config.apiKey) {
    return { authenticated: true };
  }
  
  if (xApikeyHeader && xApikeyHeader === config.apiKey) {
    return { authenticated: true };
  }

  // 4. Se chegou aqui, falhou em todos os métodos
  logger.warn("WEBHOOK_AUTH_REJECTED", "Falha na autenticação do webhook", { 
    url: request.url,
    receivedHeaders: headerKeys,
    hasProvidedSecret: !!providedSecret,
    hasApikey: !!apikeyHeader
  });

  return { authenticated: false, error: "Unauthorized: Invalid authentication credentials" };
}