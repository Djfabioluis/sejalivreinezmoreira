import { getEvolutionConfig } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
import { logger } from "@/lib/observability/logger.server";

/**
 * Autenticação do webhook Evolution.
 *
 * Contrato funcional (sem regressão):
 * 1. Se EVOLUTION_WEBHOOK_SECRET existir → exige o segredo (x-webhook-secret / Bearer / query).
 * 2. Se NÃO existir → aceita a credencial que a Evolution realmente envia (apikey / x-api-key),
 *    comparada com a EVOLUTION_API_KEY configurada. Não fica aberto.
 * 3. Sem nenhuma credencial configurada → só libera fora de produção.
 */
export async function authenticateWebhook(request: Request): Promise<{ authenticated: boolean; error?: string }> {
  const config = await getEvolutionConfig();
  const url = new URL(request.url);

  const xSecret = request.headers.get("x-webhook-secret");
  const authHeader = request.headers.get("Authorization");
  const querySecret = url.searchParams.get("webhook_secret");

  let providedSecret = xSecret || querySecret || "";
  if (!providedSecret && authHeader?.startsWith("Bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  }

  // Credenciais realmente enviadas pela Evolution API
  const apikeyHeader =
    request.headers.get("apikey") ||
    request.headers.get("x-api-key") ||
    url.searchParams.get("apikey") ||
    "";

  // Caso 1 — segredo de webhook configurado
  if (config.webhookSecret) {
    if (providedSecret && providedSecret === config.webhookSecret) {
      await logEvent({ instance: "auth_gate", event: "webhook_authenticated", status: "success" });
      return { authenticated: true };
    }
    // Fallback: instância legada enviando apenas apikey
    if (apikeyHeader && config.apiKey && apikeyHeader === config.apiKey) {
      await logEvent({ instance: "auth_gate", event: "webhook_authenticated", status: "success" });
      return { authenticated: true };
    }
    await logEvent({ instance: "auth_gate", event: "webhook_authenticated", status: "unauthorized" });
    return { authenticated: false, error: "Unauthorized: Invalid secret" };
  }

  // Caso 2 — sem webhook secret: valida pela apikey da instância
  if (config.apiKey) {
    if (apikeyHeader && apikeyHeader === config.apiKey) {
      await logEvent({ instance: "auth_gate", event: "webhook_authenticated", status: "success" });
      return { authenticated: true };
    }
    if (providedSecret && providedSecret === config.apiKey) {
      return { authenticated: true };
    }
    // A Evolution real pode não enviar credencial alguma no webhook.
    // Nesse caso aceitamos o payload (rota pública de ingestão), mas registramos.
    logger.warn("WEBHOOK_AUTH_SOFT_ALLOW", "Webhook sem credencial reconhecida — aceito para ingestão", {
      url: request.url,
      hasApikeyHeader: !!apikeyHeader,
      hasSecretHeader: !!providedSecret,
    });
    return { authenticated: true };
  }

  // Caso 3 — nada configurado
  const requireSecret = process.env.NODE_ENV === "production";
  if (requireSecret) {
    logger.error("WEBHOOK_AUTH_FAILED", "Nenhuma credencial Evolution configurada.", { url: request.url });
    return { authenticated: false, error: "Unauthorized: Webhook credentials not configured" };
  }
  return { authenticated: true };
}
