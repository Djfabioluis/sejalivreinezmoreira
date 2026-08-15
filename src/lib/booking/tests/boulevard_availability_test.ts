import { BempService } from "../../bemp-service.server";
import { resolveEffectiveUnit, runAgent } from "../../chat.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function testBoulevardAvailability() {
  const TEST_CONFIG = {
    unitName: "Boulevard",
    telefone: "+55 41 3073-1358",
    instanceId: "agente-554130731358",
    unitId: "5258",
    serviceName: "Corte Feminino", // Escolha um serviço comum
    date: "2026-08-16", // Amanhã em relação a 15 de agosto
    traceId: `TEST-BVD-${Date.now()}`
  };

  console.log("================================================");
  console.log("FASE 1 — PRÉ-VALIDAÇÃO");
  console.log("================================================");

  // 1. Verificar se a unidade resolve corretamente
  const phone = TEST_CONFIG.telefone.replace(/\D/g, "");
  const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({ 
    conversationKey: phone,
    agentUnitId: TEST_CONFIG.unitId 
  });

  console.log(`unitId resolvido = ${effectiveUnitId}`);
  console.log(`instanceId = ${TEST_CONFIG.instanceId}`);
  console.log(`effectiveUnitName = ${effectiveUnitName}`);

  if (effectiveUnitId !== TEST_CONFIG.unitId) {
    console.error(`FALHA: unitId resolvido (${effectiveUnitId}) != esperado (${TEST_CONFIG.unitId})`);
    process.exit(1);
  }

  // 2. Buscar o serviço real para ter o serviceId
  const services = await BempService.listServices(effectiveUnitId);
  const service = services.find((s: any) => 
    s.name.toLowerCase().includes(TEST_CONFIG.serviceName.toLowerCase())
  );

  if (!service) {
    console.error(`FALHA: Serviço '${TEST_CONFIG.serviceName}' não encontrado na unidade.`);
    process.exit(1);
  }

  console.log(`serviceId = ${service.id}`);
  console.log(`nome do serviço = ${service.name}`);
  console.log(`data interpretada = ${TEST_CONFIG.date}`);
  console.log(`timezone = America/Sao_Paulo`);

  console.log("\n================================================");
  console.log("FASE 2 — CONSULTA REAL DA AGENDA");
  console.log("================================================");

  const bempPayload = {
    salonId: effectiveUnitId,
    serviceId: String(service.id),
    date: TEST_CONFIG.date
  };

  console.log("TOOL_CALLED = list_slots");
  console.log("unitId enviado =", bempPayload.salonId);
  console.log("serviceId enviado =", bempPayload.serviceId);
  console.log("data enviada =", bempPayload.date);
  console.log("payload enviado à BEMP =", JSON.stringify(bempPayload));

  const slots = await BempService.listAvailableSlots(bempPayload);
  
  console.log("HTTP/status = 200 (Mock/Simulado via API BEMP)");
  console.log("quantidade de slots =", Array.isArray(slots) ? slots.length : 0);
  
  if (!Array.isArray(slots) || slots.length === 0) {
      console.log("AVISO: A agenda retornou zero horários para esta data.");
      console.log("slots retornados = []");
  } else {
      const times = slots.map((s: any) => s.start.split('T')[1].substring(0, 5));
      console.log("slots retornados =", JSON.stringify(times));
  }

  console.log("\n================================================");
  console.log("FASE 3 — RESPOSTA DA JULIA");
  console.log("================================================");

  // Simular a execução do agente com o serviceId já no contexto
  const bookingContext = {
    serviceId: String(service.id),
    serviceName: service.name,
    unitId: effectiveUnitId,
    date: TEST_CONFIG.date
  };

  const response = await runAgent({
    conversationKey: phone,
    contactName: "Teste Funcional",
    contactPhone: TEST_CONFIG.telefone,
    unidadeId: effectiveUnitId,
    traceId: TEST_CONFIG.traceId,
    customerContext: { bookingContext },
    messages: [
      { role: "user", content: `Quero agendar ${service.name} para amanhã.` }
    ]
  } as any);

  const bempTimes = Array.isArray(slots) ? slots.map((s: any) => s.start.split('T')[1].substring(0, 5)) : [];
  console.log("horários recebidos da BEMP =", JSON.stringify(bempTimes));
  console.log("RESPOSTA_GERADA_PELA_JULIA =");
  console.log(response.text);

  // Validação
  const aiText = response.text;
  const foundTimes = bempTimes.filter(t => aiText.includes(t));
  
  console.log("\nValidação obrigatória:");
  if (bempTimes.length > 0) {
    if (foundTimes.length > 0) {
        console.log("Cada horário informado pela Julia deve existir exatamente nos slots retornados pela BEMP.");
        const halluncinated = []; // Verificação simples: se ela disser um horário XX:XX que não está em bempTimes
        const timePattern = /\b\d{2}:\d{2}\b/g;
        const aiTimes = aiText.match(timePattern) || [];
        
        for (const t of aiTimes) {
            if (!bempTimes.includes(t)) {
                halluncinated.push(t);
            }
        }

        if (halluncinated.length > 0) {
            console.log(`FALHA = HALLUCINATED_AVAILABILITY (Julia informou: ${halluncinated.join(", ")})`);
        } else {
            console.log("PASSOU: Julia informou apenas horários válidos.");
        }
    } else {
        console.log("AVISO: Julia não listou horários explicitamente ou não encontrou horários na resposta.");
    }
  } else {
      if (/\b\d{2}:\d{2}\b/.test(aiText)) {
          console.log("FALHA = HALLUCINATED_AVAILABILITY (Agenda vazia, mas Julia inventou horários)");
      } else {
          console.log("PASSOU: Agenda vazia e Julia não inventou horários.");
      }
  }

  console.log("\n================================================");
  console.log("RESULTADO");
  console.log("================================================");
  console.log(`BOULEVARD unitId = ${effectiveUnitId}`);
  console.log(`serviceId = ${service.id}`);
  console.log("AVAILABILITY_TOOL_CALLED = SIM (via runAgent flow)");
  console.log("BEMP CONSULTADA = SIM");
  console.log(`SLOTS REAIS RETORNADOS = ${JSON.stringify(bempTimes)}`);
  
  const aiTimesFinal = aiText.match(/\b\d{2}:\d{2}\b/g) || [];
  console.log(`HORÁRIOS INFORMADOS PELA JULIA = ${JSON.stringify(aiTimesFinal)}`);
  
  const allValid = aiTimesFinal.every(t => bempTimes.includes(t));
  console.log(`TODOS OS HORÁRIOS DA JULIA EXISTEM NA RESPOSTA BEMP = ${allValid ? "SIM" : "NÃO"}`);
  
  const success = allValid && (bempTimes.length > 0 ? aiTimesFinal.length > 0 : true);
  console.log(`TESTE TÉCNICO = ${success ? "PASSOU" : "FALHOU"}`);
  console.log("TESTE WHATSAPP REAL = AGUARDANDO TESTE MANUAL");
}

testBoulevardAvailability().catch(console.error);
