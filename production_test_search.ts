import { BempService } from "./src/lib/bemp-service.server";

async function test() {
  console.log("--- TESTING MULTI-VARIANT APPOINTMENT SEARCH ---");
  const params = {
    phone_country_code: "55",
    phone_area_code: "41",
    phone_number: "992495561"
  };

  try {
    const results = await BempService.listCustomerAppointments(params);
    console.log(`FOUND ${results.length} APPOINTMENTS`);
    if (results.length > 0) {
      console.log("SUCCESS DATA:", JSON.stringify(results[0]));
    } else {
      console.log("NO APPOINTMENTS FOUND EVEN WITH VARIATIONS");
    }
  } catch (err: any) {
    console.log("TEST CRASHED:", err.message);
  }
}

test();
