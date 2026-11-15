// Formatting helpers shared by all pages. Dates come from the server as
// "YYYY-MM-DD" or "YYYY-MM-DD HH:mm" in the app timezone, so they are parsed
// as local dates on purpose (never through UTC).

const LOCALE = 'en-GB';

const moneyFormatter = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hoursFormatter = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(amount: number): string {
    return `${moneyFormatter.format(amount)} RON`;
}

/** 135 -> "2:15" */
export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
}

/** 135 -> "2.25" (decimal hours, as used in reports and Excel) */
export function formatHours(minutes: number): string {
    return hoursFormatter.format(minutes / 60);
}

export function parseDate(value: string): Date {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function addDays(value: string, days: number): string {
    const date = parseDate(value);
    date.setDate(date.getDate() + days);
    return toDateString(date);
}

/** "2026-11-14" -> "Sat, 14 Nov 2026" */
export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }): string {
    return parseDate(value).toLocaleDateString(LOCALE, options);
}

/** "2026-11-14" -> "November 2026" */
export function formatMonth(value: string): string {
    return parseDate(value).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
}

/** "2026-11-14 07:30" -> "07:30" */
export function timeOf(value: string): string {
    return value.slice(11, 16);
}

/** Minutes between two "HH:mm" times; an end before the start means the next day. */
export function minutesBetween(start: string, end: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = eh * 60 + em - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return diff;
}

/** "08:30" + 90 -> "10:00" (wraps past midnight) */
export function addMinutesToTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Accepts "1:30", "1.5", "1,5", "90m", "2h" and returns minutes. */
export function parseDurationInput(value: string): number | null {
    const v = value.trim().toLowerCase();
    if (!v) return null;
    let match = v.match(/^(\d{1,2}):(\d{1,2})$/);
    if (match) return Number(match[1]) * 60 + Number(match[2]);
    match = v.match(/^(\d+)\s*m$/);
    if (match) return Number(match[1]);
    match = v.match(/^(\d+(?:[.,]\d+)?)\s*h?$/);
    if (match) return Math.round(parseFloat(match[1].replace(',', '.')) * 60);
    return null;
}

/**
 * Reads a typed time as 24-hour "HH:mm", or null when it is not a valid time.
 * Accepts "8" → 08:00, "830" / "0830" → 08:30, "17:5" → 17:05, "8.30", "8,30", "8h30", "8 30".
 */
export function parseTimeInput(value: string): string | null {
    const v = value.trim().toLowerCase();
    let h: number;
    let m: number;

    if (/^\d{1,2}$/.test(v)) {
        h = Number(v);
        m = 0;
    } else if (/^\d{3,4}$/.test(v)) {
        h = Number(v.slice(0, -2));
        m = Number(v.slice(-2));
    } else {
        const match = v.match(/^(\d{1,2})\s*[:.,h ]\s*(\d{1,2})$/);
        if (!match) return null;
        h = Number(match[1]);
        m = Number(match[2]);
    }

    if (h > 23 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Moves a "HH:mm" time to the next/previous multiple of `step` minutes, wrapping around midnight. */
export function stepTime(time: string, direction: 1 | -1, step = 15): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m;
    const snapped = direction === 1 ? Math.floor(total / step) * step + step : Math.ceil(total / step) * step - step;
    const wrapped = ((snapped % 1440) + 1440) % 1440;
    return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

export function nowTime(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
