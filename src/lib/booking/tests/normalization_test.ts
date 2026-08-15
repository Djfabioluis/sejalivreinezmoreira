
import { extractBookingSlots } from "../context";

async function testNormalization() {
  console.log("=== TESTE DE NORMALIZAÇÃO 'MÃO' -> 'MANICURE' ===");
  
  const texts = [
    "Quero fazer a mão hoje",
    "Tem horário para mãos?",
    "fazer a mão",
    "quero manicure hoje"
  ];

  for (const text of texts) {
    const extracted = extractBookingSlots(text, new Date());
    console.log(`\nTexto: "${text}"`);
    console.log(`serviceText (Intent): ${extracted.serviceText}`);
    console.log(`date: ${extracted.date}`);
    
    if (extracted.serviceText === "manicure") {
      console.log("MATCH: 'manicure' detectado corretamente.");
    } else {
      console.log("FALHA: Intenção incorreta.");
    }
  }
}

testNormalization().catch(console.error);
