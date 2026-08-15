import { supabase } from "../../../integrations/supabase/client";

// Mock minimal da resolveEffectiveUnit para o teste se não conseguir importar
async function resolveEffectiveUnitMock(params: { conversationKey?: string; agentUnitId?: string | null }) {
  const { conversationKey, agentUnitId } = params;
  let conversationUnitId: string | null = null;
  let source: "conversation" | "agent" = "agent";

  if (conversationKey) {
    const { data } = await supabase
      .from("wa_conversas")
      .select("unidade_id")
      .eq("phone", conversationKey)
      .maybeSingle();

    if (data?.unidade_id) {
      conversationUnitId = data.unidade_id;
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
    
    const { data: agent } = await supabase
      .from("wa_agentes")
      .select("unidade_id")
      .eq("instancia", t.instanceId)
      .maybeSingle();
    
    console.log(`WA_AGENT_UNIT = ${agent?.unidade_id}`);
    
    const res = await resolveEffectiveUnitMock({ agentUnitId: agent?.unidade_id });
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
  
  const phoneVentura = "5541998803684";
  const convKeyBoulevard = `agente-554130731358:${phoneVentura}`;
  
  console.log(`Testando conversa Boulevard com telefone da Ventura:`);
  console.log(`conversationKey = ${convKeyBoulevard}`);
  
  const { data: agentBoulevard } = await supabase
      .from("wa_agentes")
      .select("unidade_id")
      .eq("instancia", "agente-554130731358")
      .maybeSingle();

  const resContamination = await resolveEffectiveUnitMock({ 
    conversationKey: convKeyBoulevard, 
    agentUnitId: agentBoulevard?.unidade_id 
  });
  
  console.log(`UNITID APÓS WA_AGENTES (agente-554130731358) = ${agentBoulevard?.unidade_id}`);
  console.log(`EFFECTIVE_UNITID (resolveEffectiveUnit) = ${resContamination.effectiveUnitId}`);
  console.log(`FONTE DA RESOLUÇÃO = ${resContamination.source}`);
  
  if (String(resContamination.effectiveUnitId) === "1377") {
    console.log("!!! CONTAMINAÇÃO COMPROVADA: resolveEffectiveUnit retornou 1377 (Ventura) para instância Boulevard!");
  }
}

runIsolationTest().catch(console.error);
