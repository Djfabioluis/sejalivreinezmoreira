import { createFileRoute } from '@tanstack/react-router';
import { detectConversationAbandonment } from '@/lib/crm/abandonment.server';
import { processPendingFollowups } from '@/lib/crm/followup-processor.server';
import { processAutomatedRecoveries } from '@/lib/crm/recovery.server';
import { updateCustomerScores } from '@/lib/crm/score.server';
import { runOpportunityEngine } from '@/lib/crm/opportunity.server';

export const Route = createFileRoute('/api/public/crm-cron')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Fail-closed: sem segredo configurado, o endpoint não executa nada.
        const cronSecret = process.env['CRON_SECRET'];
        if (!cronSecret) {
          console.error("[crm-cron] CRON_SECRET não configurado — requisição rejeitada.");
          return new Response('Service unavailable', { status: 503 });
        }

        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${cronSecret}`) {
          return new Response('Unauthorized', { status: 401 });
        }

        try {
          // 1. Detect Abandonment (updates stages)
          await detectConversationAbandonment();
          
          // 2. Process Followups (sends messages)
          await processPendingFollowups();

          // 3. Process Recoveries
          await processAutomatedRecoveries();

          // 4. Update AI Scores
          await updateCustomerScores();

          // 5. Run Opportunity Engine
          await runOpportunityEngine();
          
          return new Response(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          console.error("[crm-cron] Handler failed:", err);
          return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
