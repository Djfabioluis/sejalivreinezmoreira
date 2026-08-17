import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START SCHEDULES V1 PROBE ---");
  const cfg = await getBempConfig();
  
  try {
    // Try /api/schedules with salon_id filter
    const url = `${cfg.apiBase}/schedules?salon_id=5258&start_date=2026-08-16&end_date=2026-08-20`;
    console.log(`Fetching from: ${url}`);
    const result = await bempFetch(url);
    const schedules = Array.isArray(result) ? result : ((result as any)?.data || []);
    console.log(`Found ${schedules.length} schedules.`);
    
    const fabio = schedules.find((s: any) => 
      String(s.customer?.name || s.customer_name || "").toLowerCase().includes("fabio")
    );
    
    if (fabio) {
      console.log("FOUND FABIO:", JSON.stringify(fabio));
    }
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }
  console.log("--- END SCHEDULES V1 PROBE ---");
}

probe();
