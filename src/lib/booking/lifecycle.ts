import { BookingContext, BookingSlot, nextRequiredSlot } from "./context";

/**
 * Centraliza as mensagens padrão para cada etapa do agendamento.
 * Garante respostas diretas para perguntas estruturais.
 */
export function getDeterministicResponse(ctx: BookingContext): string | null {
  const slot = nextRequiredSlot(ctx);

  switch (slot) {
    case "service":
      return "Qual serviço você gostaria de fazer? 💜";
    case "date":
      return "Qual dia você prefere? 💜";
    case "availability":
      return "Vou verificar os horários disponíveis. Você prefere manhã, tarde ou noite?";
    case "confirmation":
      // A IA pode humanizar a confirmação, mas aqui fornecemos a base determinística
      // se o sistema precisar intervir
      return null; 
    case "completed":
      return "Seu agendamento já está confirmado! Você gostaria de ver os detalhes ou precisa de mais alguma coisa? 💜";
    default:
      return null;
  }
}

/**
 * Verifica se a resposta gerada pelo Gemini está repetindo uma pergunta
 * que o sistema já sabe a resposta.
 */
export function isRedundantQuestion(text: string, ctx: BookingContext): boolean {
  const t = text.toLowerCase();
  
  if ((ctx.serviceId || ctx.serviceName) && (t.includes("qual serviço") || t.includes("que serviço") || t.includes("procedimento"))) {
    return true;
  }
  
  if (ctx.date && (t.includes("qual dia") || t.includes("qual data") || t.includes("que dia"))) {
    return true;
  }

  if ((ctx.selectedSlot || ctx.time) && (t.includes("qual horário") || t.includes("que horas"))) {
    return true;
  }

  return false;
}
