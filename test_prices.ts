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
      const filtered = services.filter((s: any) => 
        s.name.toLowerCase().includes("manicure") || 
        s.name.toLowerCase().includes("pé e mão") || 
        s.name.toLowerCase().includes("escova") || 
        s.name.toLowerCase().includes("corte")
      );
      
      for (const s of filtered) {
        console.log(\`\${unit.name} | \${s.id} | \${s.name} | R$ \${s.price.toFixed(2)} | \${s.duration}min\`);
      }
    } catch (err) {
      console.error(\`Erro na unidade \${unit.name}: \`, err);
    }
  }
}

test();
