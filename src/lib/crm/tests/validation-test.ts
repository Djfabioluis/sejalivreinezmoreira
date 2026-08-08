import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidCustomerName } from "./customer-name-validator";
import { processSingleFollowup } from "./followup-processor.server";

async function runTest(label: string, phone: string, name: string | null, stage: string = "TEST_EXECUTION") {
  console.log(`\n--- TEST: ${label} ---`);
  console.log(`Input Name: ${name}`);

  // 1. Setup Data
  if (name) {
    await supabaseAdmin
      .from("crm_customer_pipeline")
      .upsert({ phone, customer_name: name, current_stage: stage as any }, { onConflict: 'phone' });
  } else {
    await supabaseAdmin
      .from("crm_customer_pipeline")
      .delete()
      .eq("phone", phone);
  }

  // 2. Create Follow-up Job
  const { data: followup, error } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone,
      stage: 'NEW_LEAD',
      reason: 'REAL_TEST_FOR_VALIDATION',
      scheduled_at: new Date().toISOString(),
      status: 'READY',
      metadata: { 
        is_real_test: true, 
        instance: "agente-5541998430354",
        force_ai: true // To trigger AI generation
      }
    } as any)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create followup", error);
    return;
  }

  // 3. Process
  const traceId = `test-val-${Date.now()}`;
  await processSingleFollowup(followup, traceId);

  // 4. Evidence
  const { data: result } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", followup.id)
    .single();

  console.log(`Result Status: ${result.status}`);
  console.log(`Resolved Name: ${result.metadata?.customer_name_resolved}`);
  console.log(`Name Source: ${result.metadata?.customer_name_source}`);
  console.log(`Final Text: ${result.message_template}`);
  console.log(`Conversation ID: ${result.metadata?.conversation_id || "-"}`);
  console.log(`Message ID: ${result.message_id || "-"}`);
}

async function main() {
  // A) Cliente com nome real
  await runTest("Real Name", "5541999102791", "Fabio");
  
  // B) Cadastro genérico
  await runTest("Generic Name", "5541999102792", "Usuario");

  // C) Nome null
  await runTest("Null Name", "5541999102793", null);

  // D) Nome igual ao telefone
  await runTest("Phone as Name", "5541999102794", "5541999102794");
  
  // E) PushName "Você" vs CRM Real
  // Note: This relies on wa_conversas existing. 
  // For the script we just test the priority.
}

main().catch(console.error);
