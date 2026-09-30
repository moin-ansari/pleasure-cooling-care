const IST_OFFSET = "+05:30";

const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

// "YYYY-MM-DD" for the given instant as seen in India.
export function istDateString(at: Date = new Date()): string {
    return dateParts.format(at);
}

export function istMinutesOfDay(at: Date = new Date()): number {
    const [h, m] = timeParts.format(at).split(":").map(Number);
    return h * 60 + m;
}

// Midnight India time on the given calendar date, as a UTC instant.
export function istDateToUtc(dateString: string): Date {
    return new Date(`${dateString}T00:00:00${IST_OFFSET}`);
}

export function addDaysToDateString(dateString: string, days: number): string {
    const base = istDateToUtc(dateString);
    base.setUTCDate(base.getUTCDate() + days);
    return istDateString(base);
}

// For columns that hold only a calendar date (no time), so "2026-09-27" is stored as exactly that day.
export const dbDay = (dateString: string): Date => new Date(`${dateString}T00:00:00.000Z`);
export const fromDbDay = (date: Date): string => date.toISOString().slice(0, 10);

// "02:00 PM" -> 840
export function slotToMinutes(slot: string): number {
    const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/i.exec(slot.trim());
    if (!match) return -1;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + Number(match[2]);
}

// "02:00 PM" -> "14:00"
export function slotToHHmm(slot: string): string {
    const minutes = slotToMinutes(slot);
    if (minutes < 0) return "10:00";
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// "2026-09-26T14:00" typed as India time -> the matching instant.
export function istLocalToUtc(local: string): Date {
    return new Date(`${local.length === 16 ? `${local}:00` : local}${IST_OFFSET}`);
}

// "26 Sep, 4:00 pm" in India time.
export function formatIst(date: Date): string {
    return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// "Sat, 26 Sep" in India time.
export function formatIstDay(date: Date): string {
    return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
