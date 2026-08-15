import { BempService } from "./src/lib/bemp-service.server";
import { normalizeServiceSearchText } from "./src/lib/service-utils";

async function simulate() {
  const unitId = "5258"; // Ventura
  const query = "mão";
  const normalized = normalizeServiceSearchText(query);
  
  const services = await BempService.listServices(unitId);
  const matches = services.filter(s => {
    const name = (s.name || s.nome || "").toLowerCase();
    return name.includes(normalized) || normalized.includes(name);
  });

  console.log("UNIT_ID:", unitId);
  console.log("QUERY:", query);
  console.log("NORMALIZED:", normalized);
  console.log("MATCHES:", JSON.stringify(matches.map(m => ({ id: m.id, name: m.name, price: m.price })), null, 2));
}

simulate().catch(console.error);
