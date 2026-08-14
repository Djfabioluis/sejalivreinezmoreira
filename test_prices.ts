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
        const name = (s.name || s.service_name || s.title || "").toLowerCase();
        return name.includes("manicure") || 
               name.includes("pé e mão") || 
               name.includes("escova") || 
               name.includes("corte");
      });
      
      for (const s of filtered) {
        let priceRaw = s.price ?? s.valor ?? 0;
        let price = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw));
        if (isNaN(price)) price = 0;

        let durationRaw = s.duration ?? s.tempo ?? 0;
        let duration = typeof durationRaw === 'number' ? durationRaw : parseInt(String(durationRaw));
        if (isNaN(duration)) duration = 0;

        const name = s.name || s.service_name || s.title || "N/A";
        console.log(unit.name + " | " + s.id + " | " + name + " | R$ " + price.toFixed(2) + " | " + duration + "min");
      }
    } catch (err: any) {
      console.error("Erro na unidade " + unit.name + ": ", err.message);
      console.error(err.stack);
    }
  }
}

test();
