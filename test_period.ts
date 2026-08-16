
import { extractBookingSlots } from "./src/lib/booking/context";

const testCases = [
  "tarde",
  "a tarde",
  "à tarde",
  "de tarde",
  "pela tarde"
];

console.log("=== TESTE DE EXTRAÇÃO DE PERÍODO ===");
testCases.forEach(t => {
  const result = extractBookingSlots(t);
  console.log(`Input: "${t}" | Period: ${result.period} | Match: ${result.period === 'tarde' ? 'SIM' : 'NÃO'}`);
});
