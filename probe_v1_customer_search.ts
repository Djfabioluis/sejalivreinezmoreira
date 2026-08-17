import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  const cfg = await getBempConfig();
  const queries = ["992495561", "99249-5561", "5541992495561", "Fabio Luis"];
  
  for (const q of queries) {
    try {
      const url = `${cfg.apiBase}/customers?q=${encodeURIComponent(q)}`;
      console.log(`PROBING SEARCH: ${url}`);
      const result = await bempFetch(url);
      console.log(`SUCCESS (${q}):`, JSON.stringify(result).slice(0, 500));
    } catch (err: any) {
      console.log(`FAILED (${q}):`, err.message);
    }
  }
}

probe();
