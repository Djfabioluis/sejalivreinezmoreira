import { BempService } from "./src/lib/bemp-service.server";

async function test() {
  const units = [
    { name: "CENTRO", id: "3051" },
    { name: "VENTURA", id: "3046" },
    { name: "BOULEVARD", id: "5258" }
  ];

  for (const unit of units) {
    console.log(`\n=== UNIDADE: ${unit.name} (ID: ${unit.id}) ===`);
    try {
      const services = (await BempService.listServices(unit.id)) as any[];
      
      const targets = ["corte", "manicure", "escova"];
      for (const target of targets) {
         const found = services.filter((s: any) => s.name.toLowerCase().includes(target));
         console.log(`[${target.toUpperCase()}]:`, found.map((s: any) => `${s.id}: ${s.name} - R$ ${s.price}`));
      }
    } catch (e) {
      console.error(`Erro na unidade ${unit.name}:`, e);
    }
  }
}

test();
