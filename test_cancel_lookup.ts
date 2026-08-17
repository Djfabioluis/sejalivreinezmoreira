import { handleCancelIntent } from "./src/lib/booking/cancel-handler";
import { createBookingContext } from "./src/lib/booking/context";

async function test() {
  console.log("--- START TEST CANCEL LOOKUP ---");
  const phone = "5541992495561";
  const unitId = "5258"; // Ventura
  
  const ctx = createBookingContext(phone, unitId);
  
  try {
    const result = await handleCancelIntent(ctx, "cancelar", phone);
    console.log("RESULT_TYPE =", result.type);
    console.log("MESSAGE =", result.message);
  } catch (err: any) {
    console.log("ERROR =", err.message);
  }
  console.log("--- END TEST CANCEL LOOKUP ---");
}

test();
