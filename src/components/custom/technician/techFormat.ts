import { addDaysToDateString, istDateString } from "@/lib/time";

// "Today", "Tomorrow" or "Sat, 26 Sep" for a "YYYY-MM-DD" date in India.
export function friendlyDay(date: string): string {
  const today = istDateString();
  if (date === today) return "Today";
  if (date === addDaysToDateString(today, 1)) return "Tomorrow";
  return new Date(`${date}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
