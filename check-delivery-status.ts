import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function main() {
  const messageId = "3EB06E21E4E905556DAF64";
  console.log(`--- VERIFICANDO STATUS DA MENSAGEM: ${messageId} ---`);

  const { data: followup } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("message_id", messageId)
    .maybeSingle();

  if (followup) {
    console.log("Registro em crm_followups:", {
      status: followup.status,
      sent_at: followup.sent_at,
      metadata: followup.metadata
    });
  } else {
    console.log("Mensagem não encontrada em crm_followups.");
  }

  // Verificar se há logs de ACK
  const { data: convs } = await supabaseAdmin
    .from("wa_conversas")
    .select("messages")
    .contains("messages", [{ id: messageId }])
    .limit(1);

  if (convs && convs.length > 0) {
    const msg = (convs[0].messages as any[]).find(m => m.id === messageId);
    console.log("Mensagem em wa_conversas:", msg);
  } else {
    console.log("Mensagem não encontrada no histórico de conversas.");
  }
}

main().catch(console.error);
