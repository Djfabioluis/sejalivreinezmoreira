import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  const p = "5541992495561";
  const cc = "55";
  const ac = "41";
  const n = "92495561"; // 8 digits version of 992495561
  
  try {
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=${cc}&phone_area_code=${ac}&phone_number=${n}`;
    console.log(`PROBING FINAL VARIANT: ${url}`);
    const result = await bempFetch(url);
    console.log(`RESULT:`, JSON.stringify(result));
  } catch (err: any) {
    console.log(`FAILED:`, err.message);
  }
}
probe();
