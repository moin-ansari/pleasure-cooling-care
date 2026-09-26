"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import BookingCard from "@/components/custom/admin/BookingCard";
import { EmptyState, ListSkeleton } from "@/components/custom/admin/ui";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { addDaysToDateString, istDateString } from "@/lib/time";
import type { Schedule } from "@/lib/domain/adminBookings";

const dayName = (date: string) => new Date(`${date}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
const dayNumber = (date: string) => Number(date.slice(8, 10));

// One day at a time, by time slot, with a strip showing how busy the coming days are.
export default function SchedulePanel() {
  const today = istDateString();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<Schedule | null>(null);
  const [technician, setTechnician] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`/api/admin/bookings/schedule?date=${date}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") setData(json.data);
        else toast.error(json.message || "Could not load the schedule");
      })
      .catch(() => !cancelled && toast.error("Could not load the schedule"));
    return () => {
      cancelled = true;
    };
  }, [date]);

  const technicians = useMemo(() => Array.from(new Set((data?.items ?? []).map((b) => b.technicianName).filter((n): n is string => !!n))).sort(), [data]);
  const items = (data?.items ?? []).filter((b) => !technician || (technician === "__none" ? !b.technicianName : b.technicianName === technician));

  // Same time slot together.
  const slots = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const b of items) map.set(b.time, [...(map.get(b.time) ?? []), b]);
    return Array.from(map.entries());
  }, [items]);

  const days = data?.days ?? [];

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setDate(addDaysToDateString(date, -1))} aria-label="Previous day" className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="text-center" aria-live="polite">
          <p className="font-semibold text-slate-900">{friendlyDay(date)}</p>
          <p className="text-xs text-slate-500">
            {date === today ? "" : <button className="text-blue-700 underline" onClick={() => setDate(today)}>Back to today</button>}
          </p>
        </div>
        <button type="button" onClick={() => setDate(addDaysToDateString(date, 1))} aria-label="Next day" className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {days.length > 0 && (
        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Pick a day">
          {days.map((d) => {
            const active = d.date === date;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setDate(d.date)}
                aria-pressed={active}
                aria-label={`${friendlyDay(d.date)}, ${d.count} ${d.count === 1 ? "job" : "jobs"}`}
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-lg border text-xs ${active ? "border-blue-700 bg-blue-700 text-white" : d.date === today ? "border-blue-300 bg-blue-50" : "bg-white"}`}
              >
                <span className={active ? "text-blue-100" : "text-slate-500"}>{dayName(d.date)}</span>
                <span className="text-sm font-semibold">{dayNumber(d.date)}</span>
                <span className={`mt-0.5 h-1.5 min-w-[6px] rounded-full px-1 text-[9px] leading-[6px] ${d.count === 0 ? "" : active ? "bg-white" : d.count >= 5 ? "bg-red-500" : d.count >= 3 ? "bg-amber-500" : "bg-emerald-500"}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {technicians.length > 0 && (
        <div className="grid gap-1">
          <label htmlFor="schedule-tech" className="text-xs font-medium text-slate-700">
            Technician
          </label>
          <select id="schedule-tech" value={technician} onChange={(e) => setTechnician(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
            <option value="">All technicians</option>
            <option value="__none">Not assigned yet</option>
            {technicians.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {!data ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing planned for this day" text={data.items.length > 0 ? "No jobs match this technician." : undefined} />
      ) : (
        <div className="grid gap-3">
          {slots.map(([slot, list]) => (
            <section key={slot} aria-label={slot}>
              <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {slot}
                <span className="rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-700">{list.length}</span>
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {list.map((b) => (
                  <BookingCard key={b.id} b={b} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
