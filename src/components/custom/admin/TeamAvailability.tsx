"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/custom/admin/ui";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { addDaysToDateString, istDateString } from "@/lib/time";
import type { TeamAvailability as Data } from "@/lib/domain/availability";

const STATE_STYLE = {
  FREE: { label: "Free", cls: "bg-emerald-100 text-emerald-800" },
  BUSY: { label: "Busy", cls: "bg-amber-100 text-amber-900" },
  OFF: { label: "Not available", cls: "bg-slate-200 text-slate-700" },
} as const;

// Who can take a job on a chosen day: free, busy (with the slots already taken) or off.
export default function TeamAvailability({ showStore }: { showStore: boolean }) {
  const today = istDateString();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`/api/admin/technicians/availability?date=${date}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") setData(json.data);
        else toast.error(json.message || "Could not load availability");
      })
      .catch(() => !cancelled && toast.error("Could not load availability"));
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setDate(addDaysToDateString(date, -1))} disabled={date <= today} aria-label="Previous day" className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white disabled:opacity-40">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="text-center" aria-live="polite">
          <p className="font-semibold text-slate-900">{friendlyDay(date)}</p>
          {date !== today && (
            <button className="text-xs text-blue-700 underline" onClick={() => setDate(today)}>
              Back to today
            </button>
          )}
        </div>
        <button type="button" onClick={() => setDate(addDaysToDateString(date, 1))} aria-label="Next day" className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {!data ? (
        <ListSkeleton rows={3} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No active technicians" />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {data.items.map((t) => {
            const st = STATE_STYLE[t.state];
            return (
              <li key={t.id} className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/technicians/${t.id}`} className="block truncate font-semibold text-slate-900 hover:underline">
                      {t.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {showStore && `${t.storeName} · `}
                      {t.phone}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                </div>

                <div className="mt-2 grid grid-cols-5 gap-1" aria-label="Time slots">
                  {data.slots.map((slot) => {
                    const taken = t.takenSlots.includes(slot);
                    return (
                      <span key={slot} className={`rounded px-0.5 py-1 text-center text-[10px] leading-tight ${t.state === "OFF" ? "bg-slate-100 text-slate-400" : taken ? "bg-amber-500 font-semibold text-white" : "bg-emerald-50 text-emerald-800"}`} title={taken ? "Has a job" : "Free"}>
                        {slot.replace(":00 ", "").replace(" ", "")}
                      </span>
                    );
                  })}
                </div>

                {t.jobs.length > 0 && (
                  <ul className="mt-2 grid gap-0.5 text-xs text-slate-600">
                    {t.jobs.map((j) => (
                      <li key={j.id}>
                        <Link href={`/admin/bookings/${j.id}`} className="hover:underline">
                          {j.time} · {j.serviceType} · {j.town}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
