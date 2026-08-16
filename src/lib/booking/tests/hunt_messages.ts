import { supabaseAdmin } from "../../../integrations/supabase/client.server";

async function huntMessages() {
  const { data: logs, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .eq('step', 'WHATSAPP_WEBHOOK_RECEIVED')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return;
  }

  logs?.forEach((l: any) => {
    console.log(`\nTRACE: ${l.trace_id} | ${l.timestamp}`);
    console.log(`PAYLOAD: ${JSON.stringify(l.payload)}`);
  });
}

huntMessages();
