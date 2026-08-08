import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import { processAutomatedRecoveries } from "./src/lib/crm/recovery.server";
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";

async function testGenericAbandonment() {
  const TEST_PHONE = '5541998430354'; // O número do usuário
  console.log(`[TEST] Starting Generic Abandonment Test for ${TEST_PHONE}...`);

  // 1. Ensure conversation is in AI mode
  console.log(`[TEST] Setting attendance_mode to AI...`);
  await supabaseAdmin
    .from('wa_conversas')
    .update({ attendance_mode: 'AI' } as any)
    .eq('phone', TEST_PHONE);

  // 2. Clear recent recoveries and followups
  console.log(`[TEST] Clearing recent recoveries and followups for ${TEST_PHONE}...`);
  await supabaseAdmin
    .from('crm_recoveries')
    .delete()
    .eq('phone', TEST_PHONE);
    
  await supabaseAdmin
    .from('crm_followups')
    .delete()
    .eq('phone', TEST_PHONE);


  // 3. Upsert pipeline to ABANDONED state
  console.log(`[TEST] Inserting ABANDONADO stage into pipeline...`);
  const { error: pipelineError } = await supabaseAdmin
    .from('crm_customer_pipeline')
    .upsert({
      phone: TEST_PHONE,
      current_stage: 'ABANDONADO',
      abandonment_reason: 'Sem resposta após escolher serviço',
      last_interaction_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    } as any, { onConflict: 'phone' });

  if (pipelineError) {
    console.error(`[TEST] Failed to upsert pipeline:`, pipelineError);
    return;
  }

  // 4. Run Recovery Engine
  console.log(`[TEST] Running processAutomatedRecoveries...`);
  await processAutomatedRecoveries();

  // 5. Check if follow-up was created
  const { data: followup } = await supabaseAdmin
    .from('crm_followups')
    .select('*')
    .eq('phone', TEST_PHONE)
    .eq('stage', 'ABANDONED_BOOKING')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!followup) {
    console.error(`[TEST] FAILURE: No follow-up created!`);
    return;
  }

  console.log(`[TEST] SUCCESS: Follow-up created with ID: ${followup.id}, Status: ${followup.status}`);

  // 6. Run Follow-up Processor (this actually sends it)
  console.log(`[TEST] Running processPendingFollowups to send the message...`);
  // Note: We need to make sure the followup is READY and scheduled_at is past
  await processPendingFollowups();

  // 7. Verify final status
  const { data: finalFollowup } = await supabaseAdmin
    .from('crm_followups')
    .select('*')
    .eq('id', followup.id)
    .single();

  console.log(`[TEST] Final Follow-up Status: ${finalFollowup?.status}`);
  console.log(`[TEST] Message ID: ${finalFollowup?.metadata?.message_id || 'NOT_SET'}`);
  
  if (finalFollowup?.status === 'SENT') {
    console.log(`[TEST] COMPLETED: Message sent successfully via Evolution API.`);
  } else {
    console.log(`[TEST] WARNING: Status is ${finalFollowup?.status}. Check logs for Evolution API errors.`);
  }
}

testGenericAbandonment().catch(console.error);
