import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  const salons = [1378, 1377, 5258];
  
  for (const id of salons) {
    try {
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?salon_id=${id}`;
      console.log(`PROBING SALON ${id}: ${url}`);
      const result = await bempFetch(url);
      const schedules = Array.isArray(result) ? result : [];
      console.log(`SALON ${id} SUCCESS! Found ${schedules.length} schedules.`);
      
      const fabio = schedules.find((s: any) => 
        JSON.stringify(s).toLowerCase().includes("fabio")
      );
      if (fabio) {
        console.log("!!! FOUND FABIO IN SALON", id, ":", JSON.stringify(fabio));
      }
    } catch (err: any) {
      console.log(`SALON ${id} FAILED:`, err.message);
    }
  }
}

probe();
