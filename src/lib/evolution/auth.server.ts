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

  // A Evolution API pode enviar o segredo configurado no campo "Segredo" das configurações globais 
  // ou da instância. Geralmente ela envia no cabeçalho x-webhook-secret ou Authorization.
  
  if (!config.webhookSecret) {
    // Se não há segredo configurado no banco/env, permitimos o tráfego 
    // com um aviso no log (Segurança Fail-Open para ambiente inicial).
    console.warn("[WEBHOOK_AUTH] EVOLUTION_WEBHOOK_SECRET not configured. Allowing traffic.");
    return { authenticated: true };
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
