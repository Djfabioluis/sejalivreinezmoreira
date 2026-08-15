import { extractBookingSlots } from './src/lib/booking/context';
import { BempService } from './src/lib/bemp-service.server';

async function test() {
  console.log("=== TESTE EXTRAÇÃO MÃO ===");
  const text = "quero fazer mão hoje";
  const extracted = extractBookingSlots(text, new Date(), {});
  console.log("Extracted:", JSON.stringify(extracted, null, 2));

  console.log("\n=== TESTE CATALOGO VENTURA (5258) ===");
  try {
    const services = await BempService.listServices("5258");
    const search = "manicure";
    const matches = services.filter(s => {
      const name = (s.name || s.nome || "").toLowerCase();
      return name.includes(search);
    });
    console.log(`Found ${matches.length} matches for 'manicure':`);
    matches.slice(0, 5).forEach(m => console.log(` - ${m.name || s.nome} (ID: ${m.id})`));
  } catch (e) {
    console.error("Erro listServices:", e);
  }
}
test();
