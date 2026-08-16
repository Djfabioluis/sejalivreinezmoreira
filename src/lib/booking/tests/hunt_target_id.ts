
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function audit() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  console.log(`Auditing logs since: ${since}`);

  const { data: logs, error } = await supabaseAdmin
    .from("evo_webhook_logs" as any)
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  const matches = (logs as any[])?.filter(l => {
      const body = JSON.stringify(l.payload);
      return body.toLowerCase().includes("mão") || body.includes("AC94D2D15029C78C19E1AEC0F95158AD");
  }) || [];

  console.log(`Found ${matches.length} matches.`);

  for (const log of matches) {
    console.log(`\n--- LOG: ${log.event} | Status: ${log.status} | Time: ${log.created_at} ---`);
    console.log(`Instance: ${log.instance}`);
    console.log(`Payload: ${JSON.stringify(log.payload)}`);
  }
}

audit();
