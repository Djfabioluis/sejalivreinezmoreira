
import { extractBookingSlots } from "./src/lib/booking/context";

const now = new Date();

function test(text: string) {
  const slots = extractBookingSlots(text, now);
  console.log(`TEXT: "${text}"`);
  console.log(`DETECTED: serviceText=${slots.serviceText}, date=${slots.date}`);
  console.log("---");
}

console.log("=== TESTE DE NORMALIZAÇÃO E DATA ===");
test("Quero fazer a mão hoje");
test("Tem horário para mão hoje?");
test("Quero fazer mão hoje");
test("Quero fazer a mão amanhã");
test("Quero fazer manicure hoje");
