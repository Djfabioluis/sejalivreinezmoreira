import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  const unitId = "5258";
  // The BEMP documentation for the webhook endpoint often implies it needs a phone to list.
  // But let's try to list by salon_id only, maybe it returns all?
  try {
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?salon_id=${unitId}`;
    console.log(`PROBING SALON ${unitId}: ${url}`);
    const result = await bempFetch(url);
    console.log(`SUCCESS! Found ${Array.isArray(result) ? result.length : 'not array'} items`);
    if (Array.isArray(result)) {
      const fabio = result.filter(a => JSON.stringify(a).toLowerCase().includes("fabio"));
      console.log("FABIO_MATCH:", JSON.stringify(fabio));
    }
  } catch (err: any) {
    console.log(`FAILED SALON LIST:`, err.message);
  }
}
probe();
