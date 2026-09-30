"use client";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarOff } from "lucide-react";
import { techFetch } from "@/components/custom/technician/techFetch";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { istDateString } from "@/lib/time";
import type { MyDay } from "@/lib/domain/availability";

const dayName = (date: string) => new Date(`${date}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });

// "Days I can work". Tap a day to mark it as not available, tap again to undo. The office sees this when assigning jobs.
export default function AvailabilityCard() {
  const [days, setDays] = useState<MyDay[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const today = istDateString();

  const load = useCallback(async () => {
    try {
      const json = await techFetch("/api/technician/availability");
      if (json.status === "success") setDays(json.data);
    } catch {
      // session errors are handled in techFetch
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (d: MyDay) => {
    if (!d.off && d.jobs > 0 && !window.confirm(`You have ${d.jobs} ${d.jobs === 1 ? "job" : "jobs"} on ${friendlyDay(d.date)}. Marking the day as not available does not cancel them. Tell the office. Continue?`)) return;
    setBusy(d.date);
    try {
      const json = await techFetch("/api/technician/availability", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: d.date, available: d.off }) });
      if (json.status === "success") {
        setDays((list) => list && list.map((x) => (x.date === d.date ? { ...x, off: json.data.off } : x)));
        toast.success(json.message);
      } else toast.error(json.message || "Could not save");
    } catch {
      // session errors are handled in techFetch
    } finally {
      setBusy(null);
    }
  };

  if (!days) return null;
  const off = days.filter((d) => d.off);

  return (
    <section className="mb-4 rounded-lg border bg-background p-3 shadow-sm" aria-label="My availability">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CalendarOff className="h-4 w-4 text-blue-800" aria-hidden="true" /> My availability
        </span>
        <span className="text-xs text-muted-foreground">{off.length === 0 ? "Working every day" : `Off: ${off.map((d) => `${dayName(d.date)} ${Number(d.date.slice(8))}`).join(", ")}`}</span>
      </button>

      {open && (
        <>
          <p className="mt-2 text-xs text-muted-foreground">Tap a day you cannot work. The office will not send you jobs without checking with you.</p>
          <div className="mt-2 grid grid-cols-7 gap-1" role="group" aria-label="Days">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                disabled={busy === d.date}
                onClick={() => toggle(d)}
                aria-pressed={d.off}
                aria-label={`${friendlyDay(d.date)}${d.off ? ", not available" : ""}${d.jobs ? `, ${d.jobs} jobs` : ""}`}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-lg border text-xs ${d.off ? "border-red-300 bg-red-50 text-red-800" : d.date === today ? "border-blue-300 bg-blue-50" : "bg-background"}`}
              >
                <span className="text-muted-foreground">{dayName(d.date)}</span>
                <span className="text-sm font-semibold">{Number(d.date.slice(8))}</span>
                <span className="text-[10px] leading-none">{d.off ? "Off" : d.jobs ? `${d.jobs} job${d.jobs > 1 ? "s" : ""}` : ""}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
