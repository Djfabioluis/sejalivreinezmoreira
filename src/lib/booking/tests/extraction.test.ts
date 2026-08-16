import { extractBookingSlots } from "../context";

const NOW = new Date("2026-08-15T12:00:00.000Z"); // Sábado

const testCases = [
  { input: "mão", service: "manicure", date: null },
  { input: "mao", service: "manicure", date: null },
  { input: "quero fazer mão hoje", service: "manicure", date: "2026-08-15" },
  { input: "quero fazer a mao hoje", service: "manicure", date: "2026-08-15" },
  { input: "quero fazer mao hoje", service: "manicure", date: "2026-08-15" },
  { input: "tem horário para mão hoje?", service: "manicure", date: "2026-08-15" },
];

console.log("==================================================");
console.log("TESTE UNITÁRIO DA EXTRAÇÃO (DETERMINÍSTICO)");
console.log("==================================================");
console.log("ENTRADA | SERVICE_INTENT | DATE_INTENT | PASSOU");
console.log("--------------------------------------------------");

let allPassed = true;

for (const { input, service, date } of testCases) {
  const extracted = extractBookingSlots(input, NOW);
  const serviceMatch = extracted.serviceText?.toLowerCase() === service;
  const dateMatch = date ? extracted.date === date : true;
  const passed = serviceMatch && dateMatch;

  if (!passed) allPassed = false;

  console.log(
    `${input.padEnd(25)} | ${String(extracted.serviceText).padEnd(14)} | ${String(extracted.date).padEnd(11)} | ${passed ? "SIM" : "NÃO"}`
  );
}

console.log("--------------------------------------------------");
console.log(`RESULTADO FINAL: ${allPassed ? "TUDO PASSOU" : "FALHA DETECTADA"}`);
process.exit(allPassed ? 0 : 1);
