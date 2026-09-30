import { addDaysToDateString, istDateString, istDateToUtc } from "@/lib/time";

export type RangePreset = "today" | "this_month" | "last_month" | "last_30" | "all" | "custom";

export const RANGE_PRESETS: RangePreset[] = ["today", "this_month", "last_month", "last_30", "all", "custom"];

export const RANGE_LABELS: Record<RangePreset, string> = {
    today: "Today",
    this_month: "This month",
    last_month: "Last month",
    last_30: "Last 30 days",
    all: "All time",
    custom: "Custom",
};

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function firstOfMonth(dateString: string): string {
    return `${dateString.slice(0, 8)}01`;
}

function firstOfNextMonth(dateString: string): string {
    const [y, m] = dateString.split("-").map(Number);
    return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

function firstOfPreviousMonth(dateString: string): string {
    const [y, m] = dateString.split("-").map(Number);
    return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

// Ranges are calendar days in India time: start is included, end is excluded.
export function resolveRange(preset: RangePreset, from?: string, to?: string, now: Date = new Date()): DateRange {
    const today = istDateString(now);
    switch (preset) {
        case "today":
            return { start: istDateToUtc(today), end: istDateToUtc(addDaysToDateString(today, 1)) };
        case "this_month":
            return { start: istDateToUtc(firstOfMonth(today)), end: istDateToUtc(firstOfNextMonth(today)) };
        case "last_month":
            return { start: istDateToUtc(firstOfPreviousMonth(today)), end: istDateToUtc(firstOfMonth(today)) };
        case "last_30":
            return { start: istDateToUtc(addDaysToDateString(today, -29)), end: istDateToUtc(addDaysToDateString(today, 1)) };
        case "custom":
            if (isDate(from) && isDate(to) && from <= to) {
                return { start: istDateToUtc(from), end: istDateToUtc(addDaysToDateString(to, 1)) };
            }
            return { start: null, end: null };
        default:
            return { start: null, end: null };
    }
}

// "2026-09" -> that whole calendar month in India time.
export function monthRange(month: string): DateRange | null {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
    const first = `${month}-01`;
    return { start: istDateToUtc(first), end: istDateToUtc(firstOfNextMonth(first)) };
}

export function currentMonth(now: Date = new Date()): string {
    return istDateString(now).slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
    let [y, m] = month.split("-").map(Number);
    m += by;
    while (m < 1) {
        m += 12;
        y -= 1;
    }
    while (m > 12) {
        m -= 12;
        y += 1;
    }
    return `${y}-${String(m).padStart(2, "0")}`;
}
