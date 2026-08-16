import { findAgentByInstance } from "./src/lib/evolution/agent.server";

async function testResolution(instance: string) {
  const agent = await findAgentByInstance(instance);
  if (!agent) {
    console.log(`[FAIL] Instance ${instance} not found`);
    return null;
  }
  return {
    instance: agent.instancia,
    unitId: agent.unidade_id,
    telefone: agent.telefone,
    nome: agent.nome
  };
}

async function run() {
  console.log("--- INICIANDO VALIDAÇÃO DE MAPEAMENTO ---");
  
  const results = await Promise.all([
    testResolution("agente-5541998430354"),
    testResolution("agente-5541998803684"),
    testResolution("agente-554130731358")
  ]);

  results.forEach((res, i) => {
    const labels = ["CENTRO", "VENTURA", "BOULEVARD"];
    const expectedIds = ["1378", "1377", "5258"];
    
    if (res) {
      const pass = res.unitId === expectedIds[i];
      console.log(`${labels[i]}: ${res.telefone} / ${res.instance} / ${res.unitId} / ${pass ? "PASSOU" : "FALHOU"}`);
    }
  });
}

run().catch(console.error);
