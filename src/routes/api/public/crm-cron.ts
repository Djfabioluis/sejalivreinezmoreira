import { createFileRoute } from '@tanstack/react-router';
import { detectConversationAbandonment } from '@/lib/crm/abandonment.server';
import { processPendingFollowups } from '@/lib/crm/followup-processor.server';
import { processAutomatedRecoveries } from '@/lib/crm/recovery.server';
import { updateCustomerScores } from '@/lib/crm/score.server';
import { runOpportunityEngine } from '@/lib/crm/opportunity.server';
import { runReturnPredictionEngine } from '@/lib/crm/prediction.server';
import { runRevenueEngine } from '@/lib/crm/revenue-engine.server';
import { generateManagementBriefing } from '@/lib/crm/management-report.server';
import { analyzeAgenda } from '@/lib/crm/agenda-analyzer.server';
import { processWaitingList } from '@/lib/crm/waiting-list.server';
import { runDailyAnalysis } from '@/lib/crm/daily-analyst.server';
import { runPredictiveCampaignEngine } from '@/lib/crm/predictive-campaign.server';
import { processBirthdays } from '@/lib/crm/birthday.server';

import { logger } from '@/lib/observability/logger.server';
import { getServerEnv } from '@/lib/config/env.server';

type JobResult = {
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
};

async function runJob(name: string, fn: () => Promise<any>): Promise<JobResult> {
  const startedAt = Date.now();
  logger.info("CRON_JOB_START", `Running job: ${name}`);
  try {
    await fn();
    const durationMs = Date.now() - startedAt;
    logger.info("CRON_JOB_SUCCESS", `Job ${name} completed`, { durationMs });
    return { name, success: true, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    logger.error("CRON_JOB_FAILED", `Job ${name} failed: ${err.message}`, { name, error: err, durationMs });
    return { name, success: false, durationMs, error: err.message };
  }
}

export const Route = createFileRoute('/api/public/crm-cron')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        
        if (!cronSecret) {
          logger.critical("CRON_SECURITY_FAILURE", "CRON_SECRET not configured");
          return new Response('Service unavailable', { status: 503 });
        }

        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${cronSecret}`) {
          return new Response('Unauthorized', { status: 401 });
        }

        const results: JobResult[] = [];
        
        // Sequencial execution for safety, but isolated
        // 0. Agenda Analysis
        results.push(await runJob("analyzeAgenda", () => analyzeAgenda()));
        // 1. Detect Abandonment
        results.push(await runJob("detectAbandonment", () => detectConversationAbandonment()));
        // 2. Process Followups
        results.push(await runJob("processFollowups", () => processPendingFollowups()));
        // 3. Process Recoveries
        results.push(await runJob("processRecoveries", () => processAutomatedRecoveries()));
        // 4. Update AI Scores
        results.push(await runJob("updateScores", () => updateCustomerScores()));
        // 5. Run Opportunity Engine
        results.push(await runJob("runOpportunityEngine", () => runOpportunityEngine()));
        // 6. Run Return Prediction Engine
        results.push(await runJob("runPredictionEngine", () => runReturnPredictionEngine()));
        // 7. Waiting List Matcher
        results.push(await runJob("processWaitingList", () => processWaitingList()));
        // 8. Run Revenue Engine
        results.push(await runJob("runRevenueEngine", () => runRevenueEngine()));

        // Time-based jobs (Brasília time)
        const now = new Date();
        const brTime = new Intl.DateTimeFormat('pt-BR', { 
          timeZone: 'America/Sao_Paulo', 
          hour: 'numeric', 
          hour12: false 
        }).format(now);
        
        const hour = parseInt(brTime);

        if (hour === 8) {
          results.push(await runJob("processBirthdays", () => processBirthdays()));
        }
        if (hour === 7) {
          results.push(await runJob("managementBriefing", () => generateManagementBriefing()));
        }

        if (hour === 22) {
          results.push(await runJob("dailyAnalysis", () => runDailyAnalysis()));
        }
        if (hour === 10) {
          results.push(await runJob("predictiveCampaign", () => runPredictiveCampaignEngine()));
        }

        const success = results.every(r => r.success);
        
        return new Response(JSON.stringify({ 
          ok: success, 
          timestamp: new Date().toISOString(),
          results 
        }), {
          status: success ? 200 : 207, // Multi-status if some failed
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
});

