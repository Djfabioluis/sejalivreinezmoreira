import { BempService } from "./src/lib/bemp-service.server";

async function test() {
  const units = [
    { id: "1377", name: "CENTRO" },
    { id: "1378", name: "VENTURA" },
    { id: "5258", name: "BOULEVARD" }
  ];

  console.log("UNIDADE | serviceId | NOME EXATO | PREÇO OFICIAL | DURAÇÃO");
  
  for (const unit of units) {
    try {
      const services = await BempService.listServices(unit.id);
      const filtered = services.filter((s: any) => {
        const name = (s.name || s.service_name || "").toLowerCase();
        return name.includes("manicure") || 
               name.includes("pé e mão") || 
               name.includes("escova") || 
               name.includes("corte");
      });
      
      for (const s of filtered) {
        const price = s.price || s.valor || 0;
        const duration = s.duration || s.tempo || 0;
        const name = s.name || s.service_name || "N/A";
        console.log(unit.name + " | " + s.id + " | " + name + " | R$ " + price.toFixed(2) + " | " + duration + "min");
      }
    } catch (err: any) {
      console.error("Erro na unidade " + unit.name + ": ", err.message);
    }
  }
}

test();
