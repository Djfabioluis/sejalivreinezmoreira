import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION BRUTE PHONE PROBE ---");
  
  // Fabio Luis might have a number without the 9th digit if registered long ago, 
  // or BEMP might have a very specific formatting requirement.
  const tests = [
    { c: "55", a: "41", n: "92495561" },
    { c: "55", a: "41", n: "992495561" },
    { c: "55", a: "41", n: "33333333" }, // Dummy to see if error message changes
  ];

  for (const t of tests) {
    try {
      console.log(`Testing whatsapp_schedule: country='${t.c}', area='${t.a}', number='${t.n}'`);
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=${t.c}&phone_area_code=${t.a}&phone_number=${t.n}`;
      const result = await bempFetch(url);
      console.log("SUCCESS!", JSON.stringify(result));
    } catch (err: any) {
      console.log("FAILED:", err.message);
    }
  }
  console.log("--- END PRODUCTION BRUTE PHONE PROBE ---");
}

probe();
