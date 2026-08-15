import { createClient } from "@supabase/supabase-js";

// Usando variáveis de ambiente do sandbox para garantir conexão correta
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function resolveEffectiveUnitMock(params: { conversationKey?: string; agentUnitId?: string | null }) {
  const { conversationKey, agentUnitId } = params;
  let conversationUnitId: string | null = null;
  let source: "conversation" | "agent" = "agent";

  if (conversationKey) {
    const { data, error } = await supabase
      .from("wa_conversas")
      .select("unidade_id")
      .eq("phone", conversationKey)
      .maybeSingle();

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
    const { data: agent } = await supabase
      .from("wa_agentes")
      .select("unidade_id")
      .eq("instancia", t.instanceId)
      .maybeSingle();
    
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
  
  // Primeiro, vamos ver se existe uma conversa Ventura com esse telefone
  const convKeyVentura = `agente-5541998803684:${phoneVentura}`;
  const { data: convVentura } = await supabase
      .from("wa_conversas")
      .select("unidade_id")
      .eq("phone", convKeyVentura)
      .maybeSingle();
  
  console.log(`Unidade na conversa VENTURA original (${convKeyVentura}) = ${convVentura?.unidade_id}`);

  const resContamination = await resolveEffectiveUnitMock({ 
    conversationKey: convKeyBoulevard, 
    agentUnitId: boulevardAgentUnitId 
  });
  
  console.log(`EFFECTIVE_UNITID para BOULEVARD com telefone VENTURA = ${resContamination.effectiveUnitId}`);
  console.log(`FONTE DA RESOLUÇÃO = ${resContamination.source}`);
  
  if (String(resContamination.effectiveUnitId) === "1377") {
    console.log("!!! CONTAMINAÇÃO COMPROVADA: resolveEffectiveUnit retornou 1377 (Ventura) para instância Boulevard!");
  } else {
    // Tentar simular o erro onde o telefone é usado como chave sem a instância
    const { data: convGlobal } = await supabase
      .from("wa_conversas")
      .select("unidade_id")
      .eq("phone", phoneVentura)
      .maybeSingle();
    
    if (convGlobal?.unidade_id) {
       console.log(`!!! EVIDÊNCIA DE CHAVE GLOBAL: Conversa encontrada apenas pelo telefone ${phoneVentura} com unidade ${convGlobal.unidade_id}`);
    } else {
       console.log("Nenhuma conversa global encontrada apenas pelo telefone.");
    }
  }
}

runIsolationTest().catch(console.error);
