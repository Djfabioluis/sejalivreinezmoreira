import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";
import { logger } from "./src/lib/observability/logger.server";

async function runAudit() {
  console.log("=== AUDITORIA DEFINITIVA DO FOLLOW-UP ===");
  try {
    await processPendingFollowups();
    console.log("Processamento concluído. Verifique os logs de auditoria.");
  } catch (error) {
    console.error("Erro durante processamento:", error);
  }
}

runAudit();
