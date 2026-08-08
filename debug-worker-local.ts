
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";

async function main() {
  console.log("Iniciando depuração manual do Followup Processor...");
  await processPendingFollowups();
  console.log("Fim do processamento.");
}

main().catch(console.error);
