import { supabase } from "../../../integrations/supabase/client";

// Mock minimal da resolveEffectiveUnit para o teste
async function resolveEffectiveUnitMock(params: { conversationKey?: string; agentUnitId?: string | null }) {
  const { conversationKey, agentUnitId } = params;
  let conversationUnitId: string | null = null;
  let source: "conversation" | "agent" = "agent";

  if (conversationKey) {
    // console.log(`[mock] Buscando unidade para conversationKey: ${conversationKey}`);
    const { data, error } = await supabase
      .from("wa_conversas")
      .select("unidade_id")
      .eq("phone", conversationKey)
      .maybeSingle();

    if (error) console.error("[mock] Erro na query wa_conversas:", error);

    if (data?.unidade_id) {
      conversationUnitId = String(data.unidade_id);
      source = "conversation";
    }
  }

  return {
    effectiveUnitId: conversationUnitId || agentUnitId || null,
    source
  };
}

async function runIsolationTest() {
  console.log("==================================================");
  console.log("4. TESTE CRÍTICO DE ISOLAMENTO (SIMULADO)");
  console.log("==================================================");

  const tests = [
    { name: "CENTRO", instanceId: "agente-5541998430354", expectedUnitId: "1378" },
    { name: "VENTURA", instanceId: "agente-5541998803684", expectedUnitId: "1377" },
    { name: "BOULEVARD", instanceId: "agente-554130731358", expectedUnitId: "5258" }
  ];

  for (const t of tests) {
    console.log(`\nENTRADA ${t.name}:`);
    console.log(`INBOUND_INSTANCE = ${t.instanceId}`);
    
    const { data: agent, error } = await supabase
      .from("wa_agentes")
      .select("unidade_id")
      .eq("instancia", t.instanceId)
      .maybeSingle();
    
    if (error) console.error("[mock] Erro na query wa_agentes:", error);
    
    const unitId = agent ? String(agent.unidade_id) : null;
    console.log(`WA_AGENT_UNIT = ${unitId}`);
    
    const res = await resolveEffectiveUnitMock({ agentUnitId: unitId });
    console.log(`EFFECTIVE_UNIT_RESOLVED = ${res.effectiveUnitId}`);
    
    if (String(res.effectiveUnitId) === String(t.expectedUnitId)) {
      console.log("RESULTADO = PASSOU");
    } else {
      console.log(`RESULTADO = FALHOU (Esperado ${t.expectedUnitId}, obtido ${res.effectiveUnitId})`);
    }
  }

  console.log("\n==================================================");
  console.log("5. TESTE DE CONTAMINAÇÃO ENTRE CONVERSAS");
  console.log("==================================================");
  
  // Telefone da Ventura: 554198803684
  const phoneVentura = "554198803684";
  const convKeyBoulevard = `agente-554130731358:${phoneVentura}`;
  
  console.log(`Testando conversa Boulevard com telefone da Ventura:`);
  console.log(`conversationKey = ${convKeyBoulevard}`);
  
  const { data: agentBoulevard } = await supabase
      .from("wa_agentes")
      .select("unidade_id")
      .eq("instancia", "agente-554130731358")
      .maybeSingle();

  const boulevardAgentUnitId = agentBoulevard ? String(agentBoulevard.unidade_id) : null;
  const resContamination = await resolveEffectiveUnitMock({ 
    conversationKey: convKeyBoulevard, 
    agentUnitId: boulevardAgentUnitId 
  });
  
  console.log(`UNITID APÓS WA_AGENTES (agente-554130731358) = ${boulevardAgentUnitId}`);
  console.log(`EFFECTIVE_UNITID (resolveEffectiveUnit) = ${resContamination.effectiveUnitId}`);
  console.log(`FONTE DA RESOLUÇÃO = ${resContamination.source}`);
  
  if (String(resContamination.effectiveUnitId) === "1377") {
    console.log("!!! CONTAMINAÇÃO COMPROVADA: resolveEffectiveUnit retornou 1377 (Ventura) para instância Boulevard!");
  } else {
    console.log("Isolamento mantido para este caso específico.");
  }
}

runIsolationTest().catch(console.error);
