"use client";
import React, { useEffect, useState } from "react";
import { Clock, MapPin, X } from "lucide-react";
import { TIME_SLOTS, MIN_LEAD_MINUTES } from "@/constants/booking";
import { istDateString, istMinutesOfDay, slotToMinutes } from "@/lib/time";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

// Next bookable slot today, in the same "far enough ahead" rule the booking form itself uses.
function nextSlotToday(): string | null {
  const cutoff = istMinutesOfDay() + MIN_LEAD_MINUTES;
  return TIME_SLOTS.find((slot) => slotToMinutes(slot) >= cutoff) ?? null;
}

export default function StorefrontTopBar({ areas }: { areas: ServiceAreaItem[] }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const districts = areas.map((a) => a.district);
  const locationLabel = districts.length === 0 ? "Coming soon" : districts.length <= 2 ? districts.join(" & ") : `${districts[0]} & ${districts.length - 1} more`;
  const slot = now ? nextSlotToday() : null;
  const timeLabel = now ? now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
  const slotLabel = !now ? "" : slot ? `Next slot today: ${slot}` : "Booking for today is closed — pick tomorrow";

  return (
    <div className="relative flex items-center justify-between gap-3 border-b bg-white px-3 py-2 text-xs text-slate-700 sm:px-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={districts.length === 0}
        className="flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 font-medium active:bg-slate-50 disabled:opacity-70"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden="true" />
        <span className="truncate">{locationLabel}</span>
      </button>

      <span className="flex shrink-0 items-center gap-1.5 text-right text-slate-500" aria-live="off">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">
          {timeLabel}
          {slotLabel && <span className="hidden text-slate-400 sm:inline"> &middot; {slotLabel}</span>}
        </span>
      </span>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mx-3 mt-1 rounded-xl border bg-white p-3 shadow-lg sm:mx-6" role="dialog" aria-label="Where we serve">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Where we serve</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {districts.length === 0 ? (
            <p className="text-sm text-muted-foreground">We&apos;re setting up service areas — check back soon.</p>
          ) : (
            <ul className="grid gap-1.5">
              {areas.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden="true" />
                  {a.district}, {a.state}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">{slotLabel}</p>
        </div>
      )}
    </div>
  );
}
