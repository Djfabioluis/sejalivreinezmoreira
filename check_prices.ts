import { BempService } from "./src/lib/bemp-service.server";

async function main() {
  const units = ["1377", "1378", "5258"]; // Centro, Ventura, Boulevard
  const names = ["Centro", "Ventura", "Boulevard"];
  
  for (let i = 0; i < units.length; i++) {
    console.log(`\n--- Unidade: ${names[i]} (ID: ${units[i]}) ---`);
    try {
      const services = await BempService.listServices(units[i]);
      const relevant = services.filter((s: any) => 
        s.name.toLowerCase().includes("manicure") || 
        s.name.toLowerCase().includes("corte") ||
        s.name.toLowerCase().includes("escova")
      );
      
      relevant.forEach((s: any) => {
        console.log(`ID: ${s.id} | Name: ${s.name} | Price: ${s.price || s.valor} | Duration: ${s.duration || s.tempo}`);
      });
    } catch (e) {
      console.log(`Erro na unidade ${units[i]}: ${e.message}`);
    }
  }
}

main();
