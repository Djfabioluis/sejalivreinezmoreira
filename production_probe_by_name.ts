import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION NAME PROBE ---");
  const name = "Fabio Luis";
  const cfg = await getBempConfig();
  
  try {
    console.log(`Searching for customer: ${name}`);
    const url = `${cfg.apiBase}/customers?name=${encodeURIComponent(name)}`;
    const result = await bempFetch(url);
    console.log("SUCCESS!", JSON.stringify(result).slice(0, 1000));
    
    if (Array.isArray(result) && result.length > 0) {
      const customer = result[0];
      console.log("REAL_CUSTOMER_ID =", customer.id);
      console.log("CUSTOMER_PHONE =", customer.phone);
      console.log("CUSTOMER_MOBILE =", customer.mobile);
      
      const scheduleUrl = `${cfg.apiBase}/customers/${customer.id}/appointments`;
      console.log(`Checking appointments for ID ${customer.id}`);
      const appointments = await bempFetch(scheduleUrl);
      console.log("APPOINTMENTS =", JSON.stringify(appointments));
    }
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }
  console.log("--- END PRODUCTION NAME PROBE ---");
}

probe();
