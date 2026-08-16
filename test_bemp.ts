import { BempService } from './src/lib/bemp-service.server';

async function run() {
  console.log("=== INICIANDO TESTE TÉCNICO UNIT 5258 ===");
  try {
    const services = await BempService.listServices("5258");
    const manicureCount = services.filter((s: any) => 
      (s.name || '').toLowerCase().includes('manicure') || 
      (s.name || '').toLowerCase().includes('mão')
    ).length;

    console.log("RESULTADO FINAL:");
    console.log(`FINAL_SERVICE_COUNT = ${services.length}`);
    console.log(`MANICURE_SERVICE_COUNT = ${manicureCount}`);
    
    if (services.length > 0) {
      console.log("SUCCESS = SIM");
    }
  } catch (err: any) {
    console.error("ERRO NO TESTE:", err.message);
  }
}

run();
