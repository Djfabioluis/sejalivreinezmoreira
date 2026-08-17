/**
 * Cancelamento de agendamentos JÁ CONFIRMADOS na BEMP.
 * Lógica pura (testável) — as chamadas reais à BEMP entram por injeção de dependência.
 * NÃO altera criação de booking, list_slots, profissional, período ou data.
 */
const SP_TZ = "America/Sao_Paulo";
function readId(v) {
    if (typeof v === "string" && v.trim())
        return v.trim();
    if (typeof v === "number")
        return String(v);
    return null;
}
/** Normaliza um item cru retornado pela BEMP para o formato interno. */
export function normalizeBempBooking(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const id = readId(raw.id) ??
        readId(raw.schedule_id) ??
        readId(raw.appointment_id) ??
        readId(raw.scheduleId) ??
        readId(raw.appointmentId);
    const start = (typeof raw.start === "string" && raw.start) ||
        (typeof raw.start_at === "string" && raw.start_at) ||
        (typeof raw.starts_at === "string" && raw.starts_at) ||
        (typeof raw.date_time === "string" && raw.date_time) ||
        null;
    if (!id || !start)
        return null;
    const serviceName = raw.service_name ||
        raw.service?.name ||
        raw.serviceName ||
        raw.name ||
        "Serviço";
    const unitId = readId(raw.salon_id) ??
        readId(raw.unit_id) ??
        readId(raw.salon?.id) ??
        readId(raw.unitId) ??
        null;
    const status = String(raw.status ?? raw.state ?? "").toLowerCase();
    if (status.includes("cancel"))
        return null;
    return { id, serviceName: String(serviceName), start, unitId, raw };
}
/** Mantém apenas agendamentos futuros e da MESMA unidade da conversa. */
export function filterFutureBookingsForUnit(rawList, conversationUnitId, now = new Date()) {
    const list = Array.isArray(rawList) ? rawList : [];
    const unit = conversationUnitId != null ? String(conversationUnitId) : null;
    return list
        .map(normalizeBempBooking)
        .filter((b) => b !== null)
        .filter((b) => {
        const ts = Date.parse(b.start);
        if (Number.isNaN(ts))
            return false;
        if (ts <= now.getTime())
            return false;
        // Proteção de unidade: se a BEMP informar a unidade, precisa bater.
        if (unit && b.unitId && b.unitId !== unit)
            return false;
        return true;
    })
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
export function formatBookingDate(iso) {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat("pt-BR", {
        timeZone: SP_TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    return fmt.format(d);
}
export function formatBookingTime(iso) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: SP_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(d);
}
export function buildSingleCancelConfirmation(b) {
    return [
        "Encontrei este agendamento 💜",
        `Serviço: ${b.serviceName}`,
        `Data: ${formatBookingDate(b.start)}`,
        `Horário: ${formatBookingTime(b.start)}`,
        "",
        "Deseja realmente cancelar?",
    ].join("\n");
}
export function buildMultipleCancelList(list) {
    const lines = list.map((b, i) => `${i + 1}. ${b.serviceName} — ${formatBookingDate(b.start).slice(0, 5)} às ${formatBookingTime(b.start)}`);
    return ["Encontrei estes agendamentos 💜", ...lines, "", "Qual deles você deseja cancelar?"].join("\n");
}
export function buildCancelSuccessMessage(b) {
    return `Pronto 💜 Seu agendamento de ${b.serviceName} do dia ${formatBookingDate(b.start).slice(0, 5)} às ${formatBookingTime(b.start)} foi cancelado.`;
}
export const NO_FUTURE_BOOKINGS_MESSAGE = "Não encontrei agendamentos futuros para cancelar. 💜";
export const CANCEL_FAILED_MESSAGE = "Não consegui concluir o cancelamento agora. 💜\nVou precisar tentar novamente.";
/** Escolhe um booking a partir da resposta do cliente ("1", "2", ou nome do serviço). */
export function chooseBookingFromReply(text, options) {
    const t = String(text || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    if (!t)
        return null;
    const num = t.match(/^(\d{1,2})[\s.)-]*$/);
    if (num) {
        const idx = Number(num[1]) - 1;
        return options[idx] ?? null;
    }
    const byName = options.find((o) => o.serviceName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(t));
    return byName ?? null;
}
const CANCEL_CONFIRM = /^(sim|s|isso|confirmo|confirmar|pode|pode cancelar|cancela|cancelar|quero|quero sim|isso mesmo|ok|claro|com certeza)[\s.,!?💜]*$/;
const CANCEL_ABORT = /^(nao|n|nao quero|deixa|deixa pra la|esquece|nao cancelar)[\s.,!?💜]*$/;
function norm(text) {
    return String(text || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}
export function isCancelConfirmation(text) {
    return CANCEL_CONFIRM.test(norm(text));
}
export function isCancelAbort(text) {
    return CANCEL_ABORT.test(norm(text));
}
