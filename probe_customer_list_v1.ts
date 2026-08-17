import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  const cfg = await getBempConfig();
  try {
    // Attempting to list customers without query to see format
    const url = `${cfg.apiBase}/customers?limit=5`;
    console.log(`PROBING LIST: ${url}`);
    const result = await bempFetch(url);
    console.log(`SUCCESS:`, JSON.stringify(result).slice(0, 2000));
  } catch (err: any) {
    console.log(`FAILED:`, err.message);
  }
}

probe();
