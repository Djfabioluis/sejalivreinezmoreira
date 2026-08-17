import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION PROBE ---");
  const phoneCountry = "55";
  const phoneArea = "41";
  const phoneNumber = "992495561";

  console.log(`Probing for: ${phoneCountry} ${phoneArea} ${phoneNumber}`);
  
  try {
    const qs = new URLSearchParams({
      phone_country_code: phoneCountry,
      phone_area_code: phoneArea,
      phone_number: phoneNumber,
    });
    
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`;
    console.log("HTTP_METHOD = GET");
    console.log("PATH = /webhooks/whatsapp_schedule");
    console.log("QUERY_PARAM_NAMES = phone_country_code, phone_area_code, phone_number");
    console.log("QUERY_PARAM_VALUES_SANITIZED =", qs.toString());

    const result = await bempFetch(url, { method: "GET" });

    console.log("HTTP_STATUS = 200");
    const shape = Array.isArray(result) ? "Array" : (result === null ? "null" : typeof result);
    console.log("RESPONSE_BODY_SHAPE =", shape);
    
    const count = Array.isArray(result) ? result.length : 0;
    console.log("RAW_RESULT_COUNT =", count);
    
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        console.log("TOP_LEVEL_KEYS =", Object.keys(result).join(", "));
    }

    console.log("RESPONSE_BODY_SANITIZED =", JSON.stringify(result).slice(0, 1000));
    
    if (Array.isArray(result)) {
      result.forEach((b: any, i: number) => {
         console.log(`Item ${i}: id=${b.id}, service=${b.service_name || b.name}, start=${b.start || b.start_at}, status=${b.status}, salonId=${b.salon_id}`);
      });
    }
  } catch (err: any) {
    console.log("ERROR_NAME =", err.name);
    console.log("ERROR_MESSAGE =", err.message);
    console.log("ERROR_STAGE = bempFetch");
    console.log("ERROR_DETAILS =", err.details || "none");
  }
  console.log("--- END PRODUCTION PROBE ---");
}

probe();
