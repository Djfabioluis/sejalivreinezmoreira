import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  const cfg = await getBempConfig();
  const salonIds = [1378, 1377, 5258];
  const date = "2026-08-18";
  
  for (const id of salonIds) {
    try {
      // Trying the most likely correct endpoint for v1: /api/salons/:id/schedules (without start/end date first)
      const url = `${cfg.apiBase}/salons/${id}/schedules?date=${date}`;
      console.log(`PROBING SALON ${id}: ${url}`);
      const result = await bempFetch(url);
      console.log(`SALON ${id} SUCCESS!`, JSON.stringify(result).slice(0, 500));
    } catch (err: any) {
      console.log(`SALON ${id} FAILED:`, err.message);
    }
  }
}

probe();
