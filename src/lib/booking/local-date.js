/**
 * Datas de calendário LOCAIS do salão (America/Sao_Paulo).
 * Nunca derivar o dia civil a partir de UTC.
 */
export const SALON_TZ = "America/Sao_Paulo";
/** YYYY-MM-DD do dia civil no timezone do salão. */
export function getLocalBookingDate(now = new Date(), tz = SALON_TZ) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}
/** Soma dias a uma data de calendário YYYY-MM-DD (sem qualquer conversão UTC de fuso). */
export function addLocalDays(isoDate, days) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
    base.setUTCDate(base.getUTCDate() + days);
    return base.toISOString().slice(0, 10);
}
/** Dia da semana (0=domingo) da data local de calendário. */
export function localWeekday(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0)).getUTCDay();
}
/** Resolve "hoje" / "amanhã" / "depois de amanhã" no timezone do salão. */
export function resolveRelativeDate(input, now = new Date(), tz = SALON_TZ) {
    const t = input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const today = getLocalBookingDate(now, tz);
    if (/\bhoje\b/.test(t))
        return today;
    if (/depois\s+de\s+amanha\b/.test(t))
        return addLocalDays(today, 2);
    if (/\bamanha\b/.test(t))
        return addLocalDays(today, 1);
    return null;
}
