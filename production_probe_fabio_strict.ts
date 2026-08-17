import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION FABIO STRICT PROBE ---");
  
  const tests = [
    { c: "55", a: "41", n: "992495561" },
    { c: "55", a: "41", n: "92495561" },
    { c: "55", a: "41", n: "99249-5561" },
  ];

  for (const t of tests) {
    try {
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=${t.c}&phone_area_code=${t.a}&phone_number=${t.n}`;
      console.log(`URL: ${url}`);
      const result = await bempFetch(url);
      console.log("SUCCESS!", JSON.stringify(result));
    } catch (err: any) {
      console.log("FAILED:", err.message);
    }
  }
  console.log("--- END PRODUCTION FABIO STRICT PROBE ---");
}

probe();
