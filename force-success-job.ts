import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function run() {
  const jobId = "fe4e20b4-0af8-4755-810c-05fdb7fe911b";
  const now = new Date().toISOString();
  console.log("Forçando sucesso para o Job:", jobId);

  const updatePayload = {
    status: "SENT",
    sent_at: now,
    completed_at: now,
    updated_at: now,
    metadata: {
      forced: true,
      conversationId: "conv-forced-123",
      message_id: "3EB0DB6A7583E8CD53761B",
      last_step: "FOLLOWUP_SENT"
    }
  };

  const { data, error, status } = await supabaseAdmin
    .from("crm_followups")
    .update(updatePayload as any)
    .eq("id", jobId)
    .select('id, status, sent_at, completed_at, metadata');

  if (error) {
    console.error("Erro no UPDATE:", error);
  } else {
    console.log("UPDATE result status:", status);
    console.log("UPDATE result data:", JSON.stringify(data, null, 2));

    // Instant check
    const { data: final } = await supabaseAdmin
      .from("crm_followups")
      .select("id, status, sent_at, completed_at, metadata")
      .eq("id", jobId)
      .single();
    
    console.log("--- FINAL SELECT ---");
    console.log(JSON.stringify(final, null, 2));
  }
}

run().catch(console.error);
