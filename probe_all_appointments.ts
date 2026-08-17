import { bempFetch, getBempConfig } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START ALL APPOINTMENTS PROBE ---");
  const cfg = await getBempConfig();
  const salonId = 5258; // Ventura
  
  try {
    // We try to list appointments for the salon.
    // In BEMP API v1, /salons/:id/appointments or /schedules might work.
    // Based on listServices, let's try /salons/:id/schedules
    const url = `${cfg.apiBase}/salons/${salonId}/schedules?start_date=2026-08-16&end_date=2026-08-20`;
    console.log(`Fetching schedules from: ${url}`);
    const result = await bempFetch(url);
    
    const schedules = Array.isArray(result) ? result : ((result as any)?.data || []);
    console.log(`Found ${schedules.length} schedules.`);
    
    const fabio = schedules.find((s: any) => 
      String(s.customer?.name).toLowerCase().includes("fabio") ||
      String(s.customer_name).toLowerCase().includes("fabio")
    );
    
    if (fabio) {
      console.log("FOUND FABIO:", JSON.stringify(fabio));
    } else {
      console.log("FABIO NOT FOUND IN THIS RANGE. Listing names found:");
      schedules.slice(0, 10).forEach((s: any) => {
        console.log("- ", s.customer?.name || s.customer_name);
      });
    }
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }
  console.log("--- END ALL APPOINTMENTS PROBE ---");
}

probe();
