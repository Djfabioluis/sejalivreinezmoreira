import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe(phoneCountry: string, phoneArea: string, phoneNumber: string, endpoint: string) {
  const qs = new URLSearchParams({
    phone_country_code: phoneCountry,
    phone_area_code: phoneArea,
    phone_number: phoneNumber,
  });
  const url = `${BEMP_WEBHOOK_BASE}/${endpoint}?${qs.toString()}`;
  try {
    const result = await bempFetch(url);
    return { success: true, body: result, params: qs.toString(), endpoint };
  } catch (err: any) {
    return { success: false, error: err.message, body: err.details, params: qs.toString(), endpoint };
  }
}

async function run() {
  console.log("--- START PRODUCTION FINAL PROBE ---");
  // Fabio Luis: (41) 99249-5561
  const variations = [
    { c: "55", a: "41", n: "992495561" },   // Current standard
    { c: "55", a: "41", n: "92495561" },    // No 9th digit
    { c: "55", a: "041", n: "992495561" },  // Area with zero
    { c: "5541", a: "", n: "992495561" },   // Combined area/country
    { c: "55", a: "", n: "41992495561" },   // Number includes area
    { c: "", a: "41", n: "992495561" },     // No country
    { c: "55", a: "41", n: "99249-5561" },  // With hyphen
  ];

  for (const v of variations) {
    console.log(`\nTesting: country='${v.c}', area='${v.a}', number='${v.n}'`);
    const res = await probe(v.c, v.a, v.n, "whatsapp_customer");
    if (res.success) {
      console.log("SUCCESS (customer):", JSON.stringify(res.body));
      const scheduleRes = await probe(v.c, v.a, v.n, "whatsapp_schedule");
      console.log("SUCCESS (schedule):", JSON.stringify(scheduleRes.body));
      break;
    } else {
      console.log(`FAILED (customer): ${res.error} - ${JSON.stringify(res.body)}`);
    }
  }
  console.log("--- END PRODUCTION FINAL PROBE ---");
}

run();
