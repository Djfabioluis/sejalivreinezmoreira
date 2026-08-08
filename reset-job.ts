import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function resetJob() {
  console.log("🔄 Resetting Job 801c0e76 with instance agente-5541998430354...");
  const { error } = await supabaseAdmin
    .from("crm_followups")
    .update({
      status: 'READY',
      attempts: 0,
      cancel_reason: null,
      metadata: {
        instance: 'agente-5541998430354',
        last_step: 'MANUAL_RESET_V2'
      }
    } as any)
    .eq("id", "801c0e76-ef6b-4a72-ae57-f4d318561bd0");

  if (error) console.error("❌ Reset failed:", error);
  else console.log("✅ Job Ready for processing.");
}

resetJob();
