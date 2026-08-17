import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION CUSTOMER FIND PROBE ---");
  const cfg = await getBempConfig();
  
  // Try finding customer by phone
  const phone = "5541992495561";
  try {
    // API v1 usually uses /customers?phone=...
    console.log(`Searching for phone: ${phone}`);
    const url = `${cfg.apiBase}/customers?phone=${phone}`;
    const result = await bempFetch(url);
    console.log("SUCCESS!", JSON.stringify(result));
  } catch (err: any) {
    console.log("FAILED (phone):", err.message);
  }
  
  console.log("--- END PRODUCTION CUSTOMER FIND PROBE ---");
}

probe();
