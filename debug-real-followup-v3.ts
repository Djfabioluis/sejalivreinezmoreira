
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function setupRealFollowup() {
  const phone = "5511998430354"; 
  const instance = "agente-5541998430354";
  
  console.log("1. Buscando conversa existente...");
  const { data: existingConv } = await supabaseAdmin
    .from("wa_conversas")
    .select("id")
    .eq("phone_number", phone)
    .maybeSingle();

  if (!existingConv) {
    console.log("Criando nova conversa...");
    const { error: insErr } = await supabaseAdmin
      .from("wa_conversas")
      .insert({
        phone_number: phone,
        instance: instance,
        contact_name: "Usuario Teste Real",
        status: "aguardando",
        updated_at: new Date().toISOString()
      } as any);
    if (insErr) console.error("Erro insert:", insErr);
  } else {
    console.log("Conversa já existe ID:", existingConv.id);
  }

  console.log("2. Criando job REAL em crm_followups...");
  // Limpar SENT anteriores para este telefone para não bater na idempotência
  await supabaseAdmin.from("crm_followups").delete().eq("phone", phone);

  const { data: followup, error: fError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: phone,
      customer_id: null,
      stage: 'ABANDONED_BOOKING',
      reason: 'NO_RESPONSE',
      priority: 1,
      scheduled_at: new Date().toISOString(),
      status: 'READY',
      attempts: 0,
      metadata: {
        instance: instance,
        contact_name: "Usuario Teste Real",
        source: "REAL_VALIDATION_V3"
      }
    } as any)
    .select()
    .single();

  if (fError) {
    console.error("Erro job:", fError);
    return;
  }
  console.log("Job REAL criado com ID:", followup.id);
  
  console.log("3. Disparando processamento manual para este ID...");
  const { processSingleFollowup } = await import("./src/lib/crm/followup-processor.server");
  const traceId = `manual-real-val-${Date.now()}`;
  
  try {
    await processSingleFollowup(followup, traceId);
    console.log("Processamento concluído. Verifique os logs e o WhatsApp.");
    
    // Buscar resultado final
    const { data: finalState } = await supabaseAdmin
      .from("crm_followups")
      .select("*")
      .eq("id", followup.id)
      .single();
      
    console.log("STATUS FINAL:", finalState.status);
    console.log("MESSAGE ID:", finalState.message_id);
    console.log("METADATA:", JSON.stringify(finalState.metadata, null, 2));
  } catch (e) {
    console.error("Erro no processamento:", e);
  }
}

setupRealFollowup().catch(console.error);
