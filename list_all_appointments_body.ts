import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  const salons = [1378, 1377, 5258];
  
  for (const id of salons) {
    try {
      // We need a phone_country_code to use this endpoint, let's try 55
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=55&salon_id=${id}`;
      console.log(`PROBING SALON ${id}: ${url}`);
      const result = await bempFetch(url);
      console.log(`SALON ${id} SUCCESS!`, JSON.stringify(result).slice(0, 1000));
    } catch (err: any) {
      console.log(`SALON ${id} FAILED:`, err.message);
    }
  }
}

probe();
