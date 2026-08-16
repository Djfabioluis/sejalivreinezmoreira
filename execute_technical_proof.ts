import { testPersistencePipeline } from "./src/lib/booking/tests/persistence-pipeline.functions";

async function runValidation() {
  console.log("INICIANDO PROVA TÉCNICA FINAL (bc4328f + Test Harness Fix)");
  
  try {
    // Executar o pipeline de dois turnos através da server function (simulada)
    // Como estamos em script, chamamos o handler diretamente
    const results = await testPersistencePipeline.handler();
    
    console.log("--- RESULTADOS DO TESTE ---");
    console.log(JSON.stringify(results, null, 2));
    
    const turn1 = results[0];
    const turn2 = results[1];
    
    const success1 = turn1.bookingContext?.serviceIntent === "manicure" && turn1.persistence?.success === true;
    const success2 = turn2.bookingContext?.serviceId !== null && turn2.bookingContext?.serviceId !== undefined;
    
    console.log("\n--- AUDITORIA DE CONTINUIDADE ---");
    console.log("TURNO 1: 'quero fazer mão hoje'");
    console.log(`- serviceIntent: ${turn1.bookingContext?.serviceIntent}`);
    console.log(`- date: ${turn1.bookingContext?.date}`);
    console.log(`- persistence success: ${turn1.persistence?.success}`);
    
    console.log("\nTURNO 2: '1' (ou 'simples')");
    console.log(`- Contexto carregado: ${turn2.loadedContext ? "SIM" : "NÃO"}`);
    console.log(`- serviceSelected: ${turn2.bookingContext?.serviceName}`);
    console.log(`- serviceId: ${turn2.bookingContext?.serviceId}`);
    console.log(`- list_slots_sent_date: ${turn2.bookingContext?.date}`);
    
    if (success1 && success2) {
      console.log("\nVALIDAÇÃO TÉCNICA: APROVADO");
    } else {
      console.log("\nVALIDAÇÃO TÉCNICA: FALHA");
      process.exit(1);
    }
  } catch (error) {
    console.error("ERRO NO HARNESS:", error);
    process.exit(1);
  }
}

runValidation();
