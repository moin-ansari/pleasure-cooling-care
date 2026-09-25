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

// "02:00 PM" -> 840
export function slotToMinutes(slot: string): number {
    const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(slot);
    if (!match) return -1;
    let hour = Number(match[1]) % 12;
    if (match[3] === "PM") hour += 12;
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
