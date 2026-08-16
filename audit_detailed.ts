
import { BempService } from './src/lib/bemp-service.server';

async function auditCatalogsDetailed() {
    const units = [
        { name: 'VENTURA', id: '5258' },
        { name: 'BOULEVARD', id: '1378' }
    ];

    console.log("=== DETAILED BEMP CATALOG AUDIT ===");
    
    for (const unit of units) {
        console.log(`\n--- UNIT: ${unit.name} (ID: ${unit.id}) ---`);
        try {
            const services = await BempService.listServices(unit.id);
            const targets = services.filter(s => {
                const name = (s.name || s.service_name || "").toLowerCase();
                return name.includes("mão") || 
                       name.includes("manicure") || 
                       name.includes("blindagem") || 
                       name.includes("alongamento") ||
                       name.includes("francesinha");
            });

            targets.forEach(s => {
                console.log(JSON.stringify({
                    serviceId: s.id,
                    name: s.name || s.service_name,
                    category: s.category?.name || s.category || s.group,
                    price: s.price || s.valor,
                    unitId: unit.id
                }, null, 2));
            });
        } catch (e) {
            console.error(`Failed to fetch for ${unit.name}: ${e.message}`);
        }
    }
}

auditCatalogsDetailed().catch(console.error);
