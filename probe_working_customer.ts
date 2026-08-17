import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  const cfg = await getBempConfig();
  const customerId = 2898528; // Mariluz Rodrigues
  try {
    const url = `${cfg.apiBase}/customers/${customerId}`;
    console.log(`PROBING CUSTOMER ${customerId}: ${url}`);
    const result = await bempFetch(url);
    console.log(`SUCCESS!`, JSON.stringify(result));
  } catch (err: any) {
    console.log(`FAILED:`, err.message);
  }
}

probe();
