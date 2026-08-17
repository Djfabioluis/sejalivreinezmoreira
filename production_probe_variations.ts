import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe(phoneCountry: string, phoneArea: string, phoneNumber: string) {
  console.log(`\nProbing variation: ${phoneCountry} ${phoneArea} ${phoneNumber}`);
  try {
    const qs = new URLSearchParams({
      phone_country_code: phoneCountry,
      phone_area_code: phoneArea,
      phone_number: phoneNumber,
    });
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_customer?${qs.toString()}`;
    const result = await bempFetch(url);
    console.log("SUCCESS!", JSON.stringify(result));
    return true;
  } catch (err: any) {
    console.log("FAILED:", err.message);
    return false;
  }
}

async function run() {
  // Fabio Luis: (41) 99249-5561
  // Variations for phone number
  const numbers = ["992495561", "92495561", "99249-5561", "9249-5561"];
  const areas = ["41", "041"];
  const countries = ["55", "+55", ""];

  for (const c of countries) {
    for (const a of areas) {
      for (const n of numbers) {
        if (await probe(c, a, n)) return;
      }
    }
  }
}

run();
