import { bempFetch, BEMP_WEBHOOK_BASE } from "./src/lib/bemp.server";

async function probe() {
  console.log("--- START PRODUCTION PROBE CUSTOMER ---");
  // Fabio Luis: 41 992495561
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
    
    const url = `${BEMP_WEBHOOK_BASE}/whatsapp_customer?${qs.toString()}`;
    console.log("HTTP_METHOD = GET");
    console.log("PATH = /webhooks/whatsapp_customer");

    const result = await bempFetch(url);

    console.log("HTTP_STATUS = 200");
    console.log("RESPONSE_BODY_SANITIZED =", JSON.stringify(result));
    
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        console.log("CUSTOMER_ID =", (result as any).id);
    }
  } catch (err: any) {
    console.log("ERROR_NAME =", err.name);
    console.log("ERROR_MESSAGE =", err.message);
    console.log("ERROR_DETAILS =", err.details || "none");
  }
  console.log("--- END PRODUCTION PROBE CUSTOMER ---");
}

probe();
