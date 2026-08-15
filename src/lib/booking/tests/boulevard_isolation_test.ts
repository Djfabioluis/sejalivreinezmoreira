import { supabase } from "../../../integrations/supabase/client";
import { resolveEffectiveUnit } from "../chat.server";

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
    
    // Simular resolveEffectiveUnit sem conversationKey (novo cliente)
    const res = await resolveEffectiveUnit({ agentUnitId: agent?.unidade_id });
    console.log(`EFFECTIVE_UNIT_RESOLVED = ${res.effectiveUnitId} (${res.effectiveUnitName})`);
    
    if (String(res.effectiveUnitId) === String(t.expectedUnitId)) {
      console.log("RESULTADO = PASSOU");
    } else {
      console.log(`RESULTADO = FALHOU (Esperado ${t.expectedUnitId}, obtido ${res.effectiveUnitId})`);
    }
  }

  console.log("\n==================================================");
  console.log("5. TESTE DE CONTAMINAÇÃO ENTRE CONVERSAS");
  console.log("==================================================");

  // Aqui testamos se resolveEffectiveUnit via conversationKey traz lixo
  // O cliente Boulevard que virou Ventura (trace webhook-1786727447354) 
  // tinha phoneLast4: 3684. 
  // Telefone da Ventura termina em 3684 (+55 41 99880-3684).
  
  const phoneVentura = "5541998803684";
  const convKeyBoulevard = `agente-554130731358:${phoneVentura}`;
  
  console.log(`Testando conversa Boulevard com telefone da Ventura:`);
  console.log(`conversationKey = ${convKeyBoulevard}`);
  
  const { data: agentBoulevard } = await supabase
      .from("wa_agentes")
      .select("unidade_id")
      .eq("instancia", "agente-554130731358")
      .maybeSingle();

  const resContamination = await resolveEffectiveUnit({ 
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
