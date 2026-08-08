import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";
import { logger } from "./src/lib/observability/logger.server";

async function debug() {
  console.log("🚀 Starting Manual Worker Debug...");
  try {
    await processPendingFollowups();
    console.log("✅ Worker Execution Finished.");
  } catch (err) {
    console.error("❌ Worker Crashed:", err);
  }
}

debug();
