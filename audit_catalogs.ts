
import { BempService } from './src/lib/bemp-service.server';

async function auditCatalogs() {
    // Current Mapping based on wa_agentes audit:
    // Centro: 1377
    // Ventura: 5258
    // Boulevard: 1378
    const units = [
        { name: 'CENTRO', id: '1377' },
        { name: 'VENTURA', id: '5258' },
        { name: 'BOULEVARD', id: '1378' }
    ];

    console.log("=== BEMP CATALOG AUDIT ===");
    
    for (const unit of units) {
        console.log(`\n--- UNIT: ${unit.name} (ID: ${unit.id}) ---`);
        try {
            const services = await BempService.listServices(unit.id);
            const filtered = services.filter(s => {
                const name = (s.name || s.service_name || "").toLowerCase();
                return name.includes("mão") || 
                       name.includes("manicure") || 
                       name.includes("blindagem") || 
                       name.includes("alongamento") ||
                       name.includes("francesinha");
            });

            if (filtered.length === 0) {
                console.log("No related services found.");
            }

            filtered.forEach(s => {
                console.log(JSON.stringify({
                    serviceId: s.id,
                    name: s.name || s.service_name,
                    category: s.category || s.group,
                    price: s.price || s.valor,
                    unitId: unit.id
                }, null, 2));
            });
        } catch (e) {
            console.error(`Failed to fetch for ${unit.name}: ${e.message}`);
        }
    }
}

auditCatalogs().catch(console.error);
