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
      if (ctx.period && !ctx.time && !ctx.selectedSlot) {
        // Se o período já está preenchido, não repetimos a pergunta genérica.
        // O orquestrador (processor.server.ts) usará isso para decidir se chama list_slots.
        return null;
      }
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

/** Formata YYYY-MM-DD para DD/MM/YYYY (sem conversão de timezone). */
export function formatBookingDate(date?: string | null): string {
  if (!date) return "";
  const m = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(date);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Mensagem determinística de confirmação após o cliente escolher um horário. */
export function buildConfirmationMessage(ctx: BookingContext): string {
  const lines = [
    "Perfeito! 💜",
    "",
    "Confirma seu agendamento?",
    `Serviço: ${ctx.serviceName ?? ctx.serviceText ?? ""}`.trimEnd(),
    `Data: ${formatBookingDate(ctx.date)}`,
    `Horário: ${ctx.time ?? ""}`.trimEnd(),
    "",
    "Posso confirmar?",
  ];
  return lines.join("\n");
}

/** Relembra a confirmação pendente (ex.: cliente enviou "?"). */
export function buildPendingConfirmationReminder(ctx: BookingContext): string {
  const service = ctx.serviceName ?? ctx.serviceText ?? "seu atendimento";
  const date = formatBookingDate(ctx.date);
  const time = ctx.time ?? "";
  return `Estamos quase lá 💜\n\nDeseja confirmar ${service}${date ? ` em ${date}` : ""}${time ? ` às ${time}` : ""}?`;
}

/**
 * Fallback seguro para quando a IA falha (AI_EMPTY_RESPONSE)
 */
export function getFallbackResponse(ctx: BookingContext): string {
  const slot = nextRequiredSlot(ctx);

  switch (slot) {
    case "service":
      return "Para te ajudar melhor, qual serviço você gostaria de agendar hoje? 💜";
    case "date":
      return "Perfeito! E para qual dia você prefere o seu agendamento? 💜";
    case "availability":
      return "Vou verificar as opções para você! Você prefere um horário pela manhã, tarde ou noite? ✨";
    case "confirmation":
      return "Posso confirmar o seu agendamento nestes detalhes que conversamos? 💜";
    case "completed":
      return "Seu agendamento foi confirmado com sucesso! 💜 Posso te ajudar com mais alguma coisa?";
    default:
      return "Entendido! Como posso te ajudar agora? 💜";
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
