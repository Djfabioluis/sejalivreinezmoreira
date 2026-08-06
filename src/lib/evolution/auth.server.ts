import { getEvolutionConfig } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";

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

  // Fail-closed: sem segredo configurado, nenhuma requisição é aceita.
  if (!config.webhookSecret) {
    await logEvent({
      instance: "auth_gate",
      event: "webhook_secret_not_configured",
      status: "unauthorized",
    });
    return {
      authenticated: false,
      error: "Webhook secret não configurado. Configure-o no painel antes de receber eventos.",
    };
  }

  if (providedSecret !== config.webhookSecret) {
    await logEvent({
      instance: "auth_gate",
      event: "webhook_authenticated",
      status: "unauthorized",
    });
    return { authenticated: false, error: "Unauthorized" };
  }

  await logEvent({
    instance: "auth_gate",
    event: "webhook_authenticated",
    status: "success",
  });

  return { authenticated: true };
}
