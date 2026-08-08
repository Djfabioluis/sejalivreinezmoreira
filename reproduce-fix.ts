
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  const phone = "5541999102791"; 
  const instance = "agente-5541998430354";
  
  console.log(`🚀 Iniciando simulação para ${phone}...`);
  
  try {
    const { normalizeBrazilianPhone } = await import("./src/lib/phone");
    const normalized = normalizeBrazilianPhone(phone);
    const normalizedPhone = normalized?.full || phone.replace(/\D/g, '');
    const conversationKey = `${instance}:${normalizedPhone}`;

    console.log(`📱 Telefone normalizado: ${normalizedPhone}`);
    console.log(`🔑 Chave da conversa: ${conversationKey}`);

    // Limpar jobs anteriores
    await supabaseAdmin.from("crm_followups").delete().eq("phone", normalizedPhone);
    console.log("🧹 Histórico de followups limpo.");

    // GARANTIR QUE A CONVERSA EXISTE NA INSTÂNCIA CORRETA ANTES DE DISPARAR
    const { data: conv } = await supabaseAdmin
      .from("wa_conversas")
      .select("phone")
      .eq("phone", conversationKey)
      .maybeSingle();

    if (!conv) {
      console.log("🆕 Criando conversa na instância correta...");
      await supabaseAdmin.from("wa_conversas").insert({
        phone: conversationKey,
        phone_number: normalizedPhone,
        instance: instance,
        contact_name: "Cliente Simulação Teste",
        attendance_mode: "AI",
        status: "novo",
        customer_context: { instance: instance }
      } as any);
    } else {
      console.log("✅ Conversa já existe na instância correta.");
    }

    const { updateCustomerPipeline } = await import("./src/lib/crm.server");
    await updateCustomerPipeline({
      phone: normalizedPhone,
      stage: 'ABANDONADO' as any,
      abandonmentReason: 'Sem resposta após escolher serviço'
    });
    console.log("📈 Pipeline atualizado.");

    const { processAutomatedRecoveries } = await import("./src/lib/crm/recovery.server");
    await processAutomatedRecoveries();
    console.log("⚙️ Motor de recuperação processado.");

    const { processPendingFollowups } = await import("./src/lib/crm/followup-processor.server");
    await processPendingFollowups();
    console.log("🤖 Processador de follow-ups executado.");

    // 2. Validar resultado
    const { data: result } = await supabaseAdmin
      .from("crm_followups")
      .select("*, rule:crm_followup_rules(name)")
      .eq("phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!result) {
      console.error("❌ Erro: Nenhum followup gerado.");
      return;
    }

    console.log("✅ Simulação concluída!");
    console.log(`🆔 JOB ID: ${result.id}`);
    console.log(`📊 STATUS: ${result.status}`);
    console.log(`💬 MESSAGE ID: ${result.message_id || 'NULL'}`);
    console.log(`🗂️ METADATA CONVERSATION ID: ${result.metadata?.conversation_id || 'NULL'}`);
    console.log(`🔍 FOUND BY: ${result.metadata?.found_by || 'NULL'}`);

    if (result.status === 'SENT' && result.metadata?.found_by === 'phone_lookup') {
      console.log("🎉 TESTE BEM-SUCEDIDO!");
    } else {
      console.log("⚠️ ALERTA: O resultado não atingiu os critérios esperados.");
      console.log("Metadata completo:", JSON.stringify(result.metadata, null, 2));
    }

  } catch (error) {
    console.error("💥 Erro durante o teste:", error);
  }
}

test();
