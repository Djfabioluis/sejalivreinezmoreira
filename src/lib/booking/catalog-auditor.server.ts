import { BookingContext } from "./context";

/**
 * CATALOG_ONLY MODE - Sanitizer
 * Garante que a resposta da IA não contenha alucinações de serviços.
 */
export function sanitizeCatalogOnlyResponse(
  text: string,
  services: any[],
  bookingContext: BookingContext
): { text: string; hallucinated: boolean } {
  if (!text) return { text, hallucinated: false };

  const lines = text.split('\n');
  let hallucinated = false;
  const sanitizedLines: string[] = [];

  // Padrões de alucinação conhecidos (opções inventadas comumente pela IA)
  const hallucinations = [
    "manicure simples",
    "francesinha",
    "blindagem",
    "alongamento",
    "pé simples",
    "mão simples",
    "unhas de gel",
    "banho de gel"
  ];

  for (const line of lines) {
    let currentLine = line;
    let lineHallucinated = false;

    // Se a linha cita um dos padrões suspeitos, verificamos se ele existe no catálogo real
    for (const h of hallucinations) {
      if (currentLine.toLowerCase().includes(h)) {
        const exists = services.some(s => 
          s.name.toLowerCase().includes(h) || 
          h.includes(s.name.toLowerCase())
        );

        if (!exists) {
          lineHallucinated = true;
          hallucinated = true;
          // Removemos a menção alucinada ou a linha inteira se for apenas a opção
          currentLine = currentLine.replace(new RegExp(h, 'gi'), '').trim();
        }
      }
    }

    if (currentLine.length > 5 || !lineHallucinated) {
      sanitizedLines.push(currentLine);
    }
  }

  // Fallback se tudo for removido (improvável)
  let finalText = sanitizedLines.join('\n').trim();
  if (finalText.length < 10 && hallucinated) {
     finalText = "Encontrei opções de serviço para você. Qual você gostaria de realizar? 💜";
  }

  return { text: finalText, hallucinated };
}
