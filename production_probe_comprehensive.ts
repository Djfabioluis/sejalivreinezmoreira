import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START COMPREHENSIVE PRODUCTION PROBE ---");
  const unitId = "5258";
  
  // 1. List ALL appointments for the unit to find the real Fabio Luis record and his stored phone
  try {
    console.log(`Step 1: Listing all appointments for unit ${unitId}`);
    const qs = new URLSearchParams({ salon_id: unitId });
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`;
    const result = await bempFetch(url);
    if (Array.isArray(result)) {
      console.log(`Found ${result.length} appointments.`);
      const fabio = result.filter(a => JSON.stringify(a).includes("Fabio"));
      console.log("FABIO_MATCHES =", JSON.stringify(fabio));
    } else {
      console.log("Result is not an array:", JSON.stringify(result));
    }
  } catch (err: any) {
    console.log("Step 1 Failed:", err.message);
  }

  // 2. Test specific phone variations for Fabio Luis (5541992495561)
  const phoneVariations = [
    { cc: "55", ac: "41", n: "992495561" }, // Original
    { cc: "55", ac: "41", n: "92495561" },  // 8 digits
    { cc: "55", ac: "041", n: "992495561" }, // Leading zero area
    { cc: "55", ac: "41", n: "41992495561" }, // Nested area code
    { cc: "55", ac: "", n: "41992495561" },  // Empty area code
  ];

  for (const v of phoneVariations) {
    try {
      const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=${v.cc}&phone_area_code=${v.ac}&phone_number=${v.n}`;
      console.log(`Step 2: Probing variation ${v.cc}-${v.ac}-${v.n}`);
      const result = await bempFetch(url);
      console.log(`Variation ${v.cc}-${v.ac}-${v.n} SUCCESS:`, JSON.stringify(result));
    } catch (err: any) {
      console.log(`Variation ${v.cc}-${v.ac}-${v.n} FAILED:`, err.message);
    }
  }
}

probe();
