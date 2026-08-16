import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function run() {
  console.log("--- DEBUG WORKER START ---");
  
  const { data: jobs } = await supabaseAdmin
    .from("crm_followups")
    .select("id, phone, status")
    .in("status", ["READY", "PENDING", "SENT"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (!jobs || jobs.length === 0) {
    console.log("Nenhum job encontrado.");
    return;
  }

  const jobId = jobs[0].id;
  console.log("Último Job ID:", jobId, "Status:", jobs[0].status);

  if (jobs[0].status !== "READY") {
      console.log("Resetando job para READY para teste...");
      await supabaseAdmin.from("crm_followups").update({ status: "READY" }).eq("id", jobId);
  }

  console.log("Iniciando processamento...");
  await processPendingFollowups();

  const { data: result, error } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    console.error("Erro ao consultar resultado:", error);
  } else {
    console.log("--- RESULTADO NO BANCO ---");
    console.log(JSON.stringify({
        id: result.id,
        status: result.status,
        sent_at: result.sent_at,
        completed_at: result.completed_at,
        metadata_message_id: (result.metadata as any)?.message_id,
        metadata_conv_id: (result.metadata as any)?.conversationId
    }, null, 2));
  }
}

run().catch(console.error);
