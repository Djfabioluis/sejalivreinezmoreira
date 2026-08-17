import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START LIST ALL APPOINTMENTS PROBE ---");
  const salonId = "5258";
  
  try {
    // Some BEMP endpoints allow listing by salon_id without phone if you're lucky
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?salon_id=${salonId}`;
    const result = await bempFetch(url);
    console.log("SUCCESS!", JSON.stringify(result).slice(0, 500));
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }
  console.log("--- END LIST ALL APPOINTMENTS PROBE ---");
}

probe();
