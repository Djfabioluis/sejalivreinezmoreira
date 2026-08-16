import { getBempConfig } from "./src/lib/bemp.server";

async function audit() {
  const TRACE_ID = "webhook-1786918557115";
  const UNIT_ID = 5258;
  
  try {
    const cfg = await getBempConfig();
    const url = `${cfg.apiBase}/salons/${UNIT_ID}/services`;
    
    console.log(`BEMP_REQUEST_URL = ${url}`);
    console.log(`BEMP_HTTP_METHOD = GET`);
    console.log(`UNIT_ID_SENT = ${UNIT_ID}`);
    
    const startedAt = Date.now();
    const res = await fetch(url, { headers: cfg.headers });
    const durationMs = Date.now() - startedAt;
    
    console.log(`BEMP_HTTP_STATUS = ${res.status}`);
    console.log(`BEMP_CONTENT_TYPE = ${res.headers.get("content-type")}`);
    
    const rawText = await res.text();
    console.log(`BEMP_RESPONSE_BODY_LENGTH = ${rawText.length}`);
    console.log(`RAW_BODY_IS_EMPTY = ${rawText.trim().length === 0 ? "SIM" : "NÃO"}`);
    
    let json;
    try {
      json = JSON.parse(rawText);
      console.log(`RAW_JSON_TYPE = ${Array.isArray(json) ? "array" : typeof json}`);
      if (json && typeof json === 'object') {
        console.log(`RAW_TOP_LEVEL_KEYS = ${Object.keys(json).join(", ")}`);
        if (Array.isArray(json)) {
          console.log(`RAW_TOP_LEVEL_ARRAY_LENGTH = ${json.length}`);
        } else {
          for (const key of Object.keys(json)) {
            if (Array.isArray(json[key])) {
              console.log(`KEY = ${key}`);
              console.log(`ARRAY_LENGTH = ${json[key].length}`);
            }
          }
        }
      }
    } catch (e) {
      console.log(`RAW_JSON_TYPE = string (invalid JSON)`);
    }

    if (json) {
      const services = Array.isArray(json) ? json : (json.data || json.services || json.items || []);
      console.log(`DIRECT_BEMP_SERVICE_COUNT = ${services.length}`);
      services.forEach((s: any) => {
        const id = s.id || s.service_id;
        const name = s.name || s.nome || s.title;
        const price = s.price || s.valor || s.value;
        if (name && (name.toLowerCase().includes("mão") || name.toLowerCase().includes("manicure"))) {
           console.log(`MATCH_FOUND: serviceId=${id}, name=${name}, price=${price}`);
        }
      });
    }

  } catch (error: any) {
    console.error(`AUDIT_FAILED: ${error.message}`);
  }
}

audit();
