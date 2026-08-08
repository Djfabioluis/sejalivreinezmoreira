
import { simulateRealCustomer } from "./src/lib/crm.functions";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  const phone = "5541998432791"; // Telefone citado pelo usuário
  const scenario = "ABANDONMENT_GENERIC";
  
  console.log(`🚀 Iniciando simulação para ${phone}...`);
  
  try {
    // 1. Simular o cliente (isso agora usa a lógica unificada e aguarda a conversa)
    // Nota: Como estamos em um script externo, precisamos simular o contexto do serverFn se possível,
    // mas aqui vamos apenas chamar a lógica ou verificar o resultado após o disparo.
    
    // Como simulateRealCustomer é um serverFn que usa middleware de auth, 
    // em um script de teste direto pode ser difícil chamar. 
    // Vou disparar a lógica manualmente aqui para validar os componentes.
    
    const { normalizeBrazilianPhone } = await import("./src/lib/phone");
    const normalized = normalizeBrazilianPhone(phone);
    const normalizedPhone = normalized?.full || phone.replace(/\D/g, '');
    const instance = "agente-01";
    const conversationKey = `${instance}:${normalizedPhone}`;

    console.log(`📱 Telefone normalizado: ${normalizedPhone}`);
    console.log(`🔑 Chave da conversa: ${conversationKey}`);

    // Limpar jobs anteriores para este telefone para ter um teste limpo
    await supabaseAdmin.from("crm_followups").delete().eq("phone", normalizedPhone);
    console.log("🧹 Histórico de followups limpo para o teste.");

    // Disparar a simulação via a lógica que implementamos no serverFn
    // (Simulando o que o serverFn faz)
    
    const { data: conv } = await supabaseAdmin
      .from("wa_conversas")
      .select("phone")
      .eq("phone", conversationKey)
      .maybeSingle();

    if (!conv) {
      console.log("🆕 Criando nova conversa...");
      await supabaseAdmin.from("wa_conversas").insert({
        phone: conversationKey,
        phone_number: normalizedPhone,
        contact_name: "Cliente Simulação Teste",
        instance: instance,
        attendance_mode: "AI",
        status: "novo"
      } as any);
    }

    const { updateCustomerPipeline } = await import("./src/lib/crm.server");
    await updateCustomerPipeline({
      phone: normalizedPhone,
      stage: 'ABANDONADO' as any,
      abandonmentReason: 'Sem resposta após escolher serviço'
    });
    console.log("📈 Pipeline atualizado para ABANDONADO.");

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
      console.log("🎉 TESTE BEM-SUCEDIDO: Lógica unificada funcionou e encontrou a conversa por telefone!");
    } else {
      console.log("⚠️ ALERTA: O resultado não atingiu os critérios esperados.");
    }

  } catch (error) {
    console.error("💥 Erro durante o teste:", error);
  }
}

test();
