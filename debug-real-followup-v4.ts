
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function setupRealFollowup() {
  const phone = "5511998430354"; 
  const instance = "agente-5541998430354";
  
  // O erro 400 da Evolution indicou que o número "5511998430354" não existe.
  // Em números de SP (DDD 11), o 9º dígito é obrigatório para celulares.
  // Vamos tentar com o formato alternativo (adicionando o 9 se faltar ou removendo se sobrar)
  const phoneVariant = "5511998430354".length === 12 ? "55119" + "998430354".slice(-8) : "5511" + "998430354".slice(-8);
  
  console.log(`Testando com variante de telefone: ${phoneVariant}`);

  console.log("1. Buscando/Criando conversa...");
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .upsert({
      phone_number: phoneVariant,
      instance: instance,
      contact_name: "Usuario Teste Real",
      phone: phoneVariant, // Incluindo o campo que deu erro de not-null antes
      status: "aguardando",
      updated_at: new Date().toISOString()
    } as any, { onConflict: "phone_number,instance" } as any)
    .select()
    .single();

  console.log("2. Criando job REAL em crm_followups...");
  await supabaseAdmin.from("crm_followups").delete().eq("phone", phoneVariant);

  const { data: followup, error: fError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: phoneVariant,
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
        source: "REAL_VALIDATION_V4"
      }
    } as any)
    .select()
    .single();

  if (fError) {
    console.error("Erro job:", fError);
    return;
  }
  
  console.log("3. Disparando processamento manual...");
  const { processSingleFollowup } = await import("./src/lib/crm/followup-processor.server");
  const traceId = `manual-real-val-${Date.now()}`;
  
  try {
    await processSingleFollowup(followup, traceId);
    
    const { data: finalState } = await supabaseAdmin
      .from("crm_followups")
      .select("*")
      .eq("id", followup.id)
      .single();
      
    console.log("STATUS FINAL:", finalState.status);
    console.log("MESSAGE ID:", finalState.message_id);
    if (finalState.status === 'SENT') {
      console.log("✅ SUCESSO! Mensagem enviada via Evolution.");
    } else {
      console.log("❌ FALHA:", finalState.metadata?.last_error?.message || finalState.cancel_reason);
      console.log("RAW ERROR:", JSON.stringify(finalState.metadata?.last_error, null, 2));
    }
  } catch (e) {
    console.error("Erro fatal no script:", e);
  }
}

setupRealFollowup().catch(console.error);
