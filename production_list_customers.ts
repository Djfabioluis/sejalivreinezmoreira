import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  const cfg = await getBempConfig();
  try {
    const url = `${cfg.apiBase}/customers?limit=10`;
    const result = await bempFetch(url);
    console.log("CUSTOMERS =", JSON.stringify(result));
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }
}

probe();
