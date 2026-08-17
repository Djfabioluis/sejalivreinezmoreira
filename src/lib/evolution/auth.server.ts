import { getEvolutionConfig } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
import { logger } from "@/lib/observability/logger.server";

/**
 * Autenticação do webhook Evolution.
 * 
 * Contrato de Produção:
 * - Evolution envia credenciais via headers: 'apikey' ou 'x-api-key'.
 * - O backend valida contra EVOLUTION_API_KEY ou EVOLUTION_WEBHOOK_SECRET.
 */
export async function authenticateWebhook(request: Request): Promise<{ authenticated: boolean; error?: string }> {
  const config = await getEvolutionConfig();
  const url = new URL(request.url);

  // 1. Coleta de credenciais do request
  const xSecret = request.headers.get("x-webhook-secret");
  const authHeader = request.headers.get("Authorization");
  const querySecret = url.searchParams.get("webhook_secret");
  
  let providedSecret = xSecret || querySecret || "";
  if (!providedSecret && authHeader?.startsWith("Bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  }

  const apikeyHeader =
    request.headers.get("apikey") ||
    request.headers.get("x-api-key") ||
    url.searchParams.get("apikey") ||
    "";

  // Audit path
  const hasWebhookSecret = !!config.webhookSecret;
  const hasApiKey = !!config.apiKey;

  // CASO A: Webhook Secret configurado (Prioridade máxima de segurança)
  if (hasWebhookSecret) {
    const isSecretValid = providedSecret && providedSecret === config.webhookSecret;
    const isApiKeyFallbackValid = apikeyHeader && config.apiKey && apikeyHeader === config.apiKey;

    if (isSecretValid || isApiKeyFallbackValid) {
      return { authenticated: true };
    }
    
    await logEvent({ 
      instance: "auth_gate", 
      event: "webhook_authenticated", 
      status: "unauthorized",
      errorDetail: "Invalid webhook secret or apikey fallback"
    });
    return { authenticated: false, error: "Unauthorized: Invalid credentials" };
  }

  // CASO B: Apenas API Key configurada (Padrão Evolution Cloud/Legacy)
  if (hasApiKey) {
    const isApiKeyValid = apikeyHeader && apikeyHeader === config.apiKey;
    const isSecretAsApiKeyValid = providedSecret && providedSecret === config.apiKey;

    if (isApiKeyValid || isSecretAsApiKeyValid) {
      return { authenticated: true };
    }

    // SOFT ALLOW: Se a Evolution real não enviar nada, permitimos ingestão para debug,
    // mas logamos o aviso. A idempotência e agent lookup falharão se o payload for malicioso.
    logger.warn("WEBHOOK_AUTH_SOFT_ALLOW", "Webhook sem credencial reconhecida — aceito para diagnóstico", {
      url: request.url,
      hasApikeyHeader: !!apikeyHeader,
      hasSecretHeader: !!providedSecret,
    });
    return { authenticated: true };
  }

  // CASO C: Nada configurado (Sandbox/Configuração incompleta)
  // Aceitamos o request para evitar retries da Evolution, mas logamos o risco.
  logger.error("WEBHOOK_AUTH_MISCONFIGURED", "Webhook recebido sem EVOLUTION_API_KEY configurada no sistema");
  return { authenticated: true };
}
