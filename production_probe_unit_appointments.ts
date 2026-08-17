import { bempFetch, BEMP_WEBHOOK_BASE, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION UNIT APPOINTMENTS PROBE ---");
  const unitId = "5258";
  const cfg = await getBempConfig();
  
  try {
    // Attempting to list all schedules for the unit to find Fabio Luis
    console.log(`Listing appointments for unit: ${unitId}`);
    const qs = new URLSearchParams({ salon_id: unitId });
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`;
    const result = await bempFetch(url);
    console.log("SUCCESS!", JSON.stringify(result).slice(0, 2000));
    
    if (Array.isArray(result)) {
      console.log("TOTAL_APPOINTMENTS =", result.length);
      const fabio = result.filter(a => JSON.stringify(a).includes("Fabio"));
      console.log("FABIO_MATCHES =", JSON.stringify(fabio));
    }
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }
  console.log("--- END PRODUCTION UNIT APPOINTMENTS PROBE ---");
}

probe();
