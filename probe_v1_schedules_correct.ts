import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  const cfg = await getBempConfig();
  try {
    // Some v1 APIs use 'salon' instead of 'salon_id'
    const url = `${cfg.apiBase}/schedules?salon=5258&date=2026-08-18`;
    console.log(`PROBING: ${url}`);
    const result = await bempFetch(url);
    console.log(`SUCCESS!`, JSON.stringify(result).slice(0, 500));
  } catch (err: any) {
    console.log(`FAILED:`, err.message);
  }
  
  try {
    // Or just all schedules for the day to find Fabio
    const url = `${cfg.apiBase}/schedules?date=2026-08-18`;
    console.log(`PROBING GLOBAL: ${url}`);
    const result = await bempFetch(url);
    console.log(`GLOBAL SUCCESS!`, JSON.stringify(result).slice(0, 500));
  } catch (err: any) {
    console.log(`GLOBAL FAILED:`, err.message);
  }
}

probe();
