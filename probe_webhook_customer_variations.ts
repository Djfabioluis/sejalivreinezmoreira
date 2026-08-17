import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  const variations = [
    { cc: "55", ac: "41", n: "992495561" },
    { cc: "55", ac: "41", n: "92495561" },
    { cc: "55", ac: "041", n: "992495561" },
    { cc: "", ac: "41", n: "992495561" },
    { cc: "55", ac: "41", n: "9992495561" },
  ];
  
  for (const v of variations) {
    try {
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_customer?phone_country_code=${v.cc}&phone_area_code=${v.ac}&phone_number=${v.n}`;
      console.log(`PROBING: ${url}`);
      const result = await bempFetch(url);
      console.log(`SUCCESS:`, JSON.stringify(result));
    } catch (err: any) {
      console.log(`FAILED (${v.cc}-${v.ac}-${v.n}):`, err.message);
    }
  }
}

probe();
