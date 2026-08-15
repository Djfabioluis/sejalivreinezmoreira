import { BempService } from './src/lib/bemp-service.server';

async function run() {
  try {
    const services = await BempService.listServices("5258");
    const filtered = services.filter(s => 
      (s.name || s.nome || "").toLowerCase().includes("manicure")
    );
    console.log("=== CATALOGO MANICURE VENTURA ===");
    console.log(JSON.stringify(filtered.map(s => ({ id: s.id, name: s.name || s.nome, price: s.price || s.valor })), null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
