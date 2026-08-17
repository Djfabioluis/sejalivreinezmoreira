import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION COMBINED PHONE PROBE ---");
  const salonId = "5258";
  
  // Fabio Luis: 41 992495561
  const tests = [
    { c: "55", a: "", n: "41992495561" },
    { c: "55", a: "41", n: "92495561" }, // without 9th digit
    { c: "55", a: "41", n: "992495561" } // standard
  ];

  for (const t of tests) {
    try {
      console.log(`Testing: country='${t.c}', area='${t.a}', number='${t.n}'`);
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=${t.c}&phone_area_code=${t.a}&phone_number=${t.n}`;
      const result = await bempFetch(url);
      console.log("SUCCESS!", JSON.stringify(result));
    } catch (err: any) {
      console.log("FAILED:", err.message);
    }
  }
  console.log("--- END PRODUCTION COMBINED PHONE PROBE ---");
}

probe();
