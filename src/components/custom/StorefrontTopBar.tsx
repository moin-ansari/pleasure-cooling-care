"use client";
import React, { useEffect, useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";
import { TIME_SLOTS, MIN_LEAD_MINUTES } from "@/constants/booking";
import { istMinutesOfDay, slotToMinutes } from "@/lib/time";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

// Next bookable slot today, in the same "far enough ahead" rule the booking form itself uses.
function nextSlotToday(): string | null {
  const cutoff = istMinutesOfDay() + MIN_LEAD_MINUTES;
  return TIME_SLOTS.find((slot) => slotToMinutes(slot) >= cutoff) ?? null;
}

// Sits on the hero's gradient, white-on-transparent — a bold "when" line over a lighter "where" line
// with a dropdown, the same two-line shape Urban Company's app uses at the very top of its home screen.
export default function StorefrontTopBar({ areas }: { areas: ServiceAreaItem[] }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const districts = areas.map((a) => a.district);
  const locationLabel = districts.length === 0 ? "Coming soon" : districts.length <= 2 ? districts.join(" & ") : `${districts[0]} & ${districts.length - 1} more`;
  const slot = ready ? nextSlotToday() : null;
  const whenLabel = !ready ? "Same-day service" : slot ? `Next slot today: ${slot}` : "Book for tomorrow";

  return (
    <div className="relative px-3 pt-3 sm:px-6">
      <p className="text-sm font-bold text-white">{whenLabel}</p>
      <button type="button" onClick={() => setOpen(true)} disabled={districts.length === 0} className="mt-0.5 flex items-center gap-1 text-xs font-medium text-blue-100 disabled:opacity-70">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {locationLabel}
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full z-30 mt-2 rounded-xl border bg-white p-3 text-left shadow-lg sm:left-6 sm:right-6" role="dialog" aria-label="Where we serve">
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
        </div>
      )}
    </div>
  );
}
