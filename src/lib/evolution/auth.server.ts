import { getEvolutionConfig } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
import { logger } from "@/lib/observability/logger.server";

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

  const requireSecret = process.env.NODE_ENV === "production" || process.env.EVOLUTION_REQUIRE_WEBHOOK_SECRET === "true";

  if (!config.webhookSecret) {
    if (requireSecret) {
      logger.error("WEBHOOK_AUTH_FAILED", "EVOLUTION_WEBHOOK_SECRET não configurado em produção.", { url: request.url });
      return { authenticated: false, error: "Unauthorized: Webhook secret not configured" };
    }
    console.warn("[WEBHOOK_AUTH] EVOLUTION_WEBHOOK_SECRET not configured. Allowing traffic in development.");
    return { authenticated: true };
  }

  if (!providedSecret) {
    logger.warn("WEBHOOK_AUTH_MISSING", "Segredo obrigatório não enviado", { url: request.url });
    return { authenticated: false, error: "Unauthorized: Webhook secret required" };
  }

  if (providedSecret !== config.webhookSecret) {
    await logEvent({
      instance: "auth_gate",
      event: "webhook_authenticated",
      status: "unauthorized",
    });
    return { authenticated: false, error: "Unauthorized: Invalid secret" };
  }

  await logEvent({
    instance: "auth_gate",
    event: "webhook_authenticated",
    status: "success",
  });

  return { authenticated: true };
}