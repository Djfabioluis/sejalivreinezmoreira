import { findAgentByInstance } from './src/lib/evolution/agent.server';
import { resolveEffectiveUnit } from './src/lib/chat.server';

async function testContamination() {
  const phone = "5541900000000";
  
  console.log("=== INICIANDO TESTE DE CONTAMINAÇÃO SEQUENCIAL ===\n");

  // A. BOULEVARD
  const agentB = await findAgentByInstance('agente-554130731358');
  const resB = await resolveEffectiveUnit({ conversationKey: `agente-554130731358:${phone}`, agentUnitId: agentB?.unidade_id });
  console.log(`BOULEVARD: unitId=${resB.effectiveUnitId}, name=${resB.effectiveUnitName}`);

  // B. VENTURA
  const agentV = await findAgentByInstance('agente-5541998803684');
  const resV = await resolveEffectiveUnit({ conversationKey: `agente-5541998803684:${phone}`, agentUnitId: agentV?.unidade_id });
  console.log(`VENTURA: unitId=${resV.effectiveUnitId}, name=${resV.effectiveUnitName}`);

  // C. CENTRO
  const agentC = await findAgentByInstance('agente-5541998430354');
  const resC = await resolveEffectiveUnit({ conversationKey: `agente-5541998430354:${phone}`, agentUnitId: agentC?.unidade_id });
  console.log(`CENTRO: unitId=${resC.effectiveUnitId}, name=${resC.effectiveUnitName}`);

  // D. BOULEVARD NOVAMENTE
  const resB2 = await resolveEffectiveUnit({ conversationKey: `agente-554130731358:${phone}`, agentUnitId: agentB?.unidade_id });
  console.log(`BOULEVARD (R): unitId=${resB2.effectiveUnitId}, name=${resB2.effectiveUnitName}`);

  const allOk = 
    resB.effectiveUnitId === '1378' && 
    resV.effectiveUnitId === '5258' && 
    resC.effectiveUnitId === '1377' && 
    resB2.effectiveUnitId === '1378';

  console.log(`\nISOLAMENTO SEQUENCIAL: ${allOk ? "✅ OK" : "❌ FALHOU"}`);
}

testContamination().catch(console.error);
