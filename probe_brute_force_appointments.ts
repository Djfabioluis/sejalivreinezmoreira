import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- BRUTE FORCE DATE PROBE ---");
  const unitId = "5258";
  
  // Try to find ANY successful phone that works to list appointments
  // Since we can't list all, let's try some common numbers from previous logs if any
  const testPhones = ["554198430354", "554130731358"]; 
  
  for (const p of testPhones) {
    try {
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=55&phone_area_code=${p.slice(2,4)}&phone_number=${p.slice(4)}`;
      console.log(`PROBING: ${url}`);
      const result = await bempFetch(url);
      if (Array.isArray(result) && result.length > 0) {
        console.log(`SUCCESS for ${p}:`, JSON.stringify(result).slice(0, 500));
      }
    } catch (e) {}
  }
}
probe();
