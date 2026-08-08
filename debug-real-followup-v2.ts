
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function setupRealFollowup() {
  const phone = "5511998430354"; // Número do usuário conforme solicitado
  const instance = "agente-5541998430354";
  
  console.log("1. Garantindo wa_conversas...");
  const { data: conv, error: convErr } = await supabaseAdmin
    .from("wa_conversas")
    .upsert({
      phone_number: phone,
      instance: instance,
      contact_name: "Usuario Teste Real",
      status: "aguardando",
      updated_at: new Date().toISOString()
    } as any, { onConflict: "phone_number,instance" })
    .select()
    .single();

  if (convErr) {
    console.error("Erro ao criar conversa:", convErr);
    return;
  }
  console.log("Conversa garantida ID:", conv.id);

  console.log("2. Criando job REAL em crm_followups...");
  // Limpando anteriores para o mesmo telefone para evitar CANCELED_ALREADY_SENT
  await supabaseAdmin.from("crm_followups").delete().eq("phone", phone);

  const { data: followup, error: fError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: phone,
      customer_id: null,
      stage: 'ABANDONED_BOOKING', // Stage real
      reason: 'NO_RESPONSE',       // Reason real
      priority: 1,
      scheduled_at: new Date().toISOString(),
      status: 'READY',
      attempts: 0,
      metadata: {
        instance: instance,
        contact_name: "Usuario Teste Real",
        source: "REAL_VALIDATION_SCRIPT"
      }
    } as any)
    .select()
    .single();

  if (fError) {
    console.error("Erro ao criar job:", fError);
    return;
  }
  console.log("Job REAL criado com ID:", followup.id);
  console.log("Agora dispare o processamento pelo painel ou aguarde o worker.");
}

setupRealFollowup().catch(console.error);
