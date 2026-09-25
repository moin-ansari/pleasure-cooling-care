"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { techFetch } from "@/components/custom/technician/techFetch";
import { currentMonth, shiftMonth } from "@/lib/dateRange";
import { rupees } from "@/lib/money";
import type { TechnicianEarnings } from "@/lib/domain/finance";

const TYPE_LABEL: Record<string, string> = {
  OFFICE_PAYMENT: "Paid to office",
  PAYOUT: "Deducted from payout",
  ADJUSTMENT: "Adjustment",
  COMMISSION_OWED: "Commission",
};

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00+05:30`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default function EarningsPage() {
  const thisMonth = currentMonth();
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<TechnicianEarnings | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    techFetch(`/api/technician/earnings?month=${month}`)
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") setData(json.data);
        else setError(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-bold">Earnings</h1>

      <div className="flex items-center justify-between rounded-lg border bg-background p-2 shadow-sm">
        <Button variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          Previous
        </Button>
        <p className="font-medium" aria-live="polite">
          {monthLabel(month)}
        </p>
        <Button variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month">
          Next
        </Button>
      </div>

      {error && <p className="py-6 text-center text-muted-foreground">Could not load your earnings. Please try again.</p>}
      {!data && !error && <p className="py-10 text-center text-muted-foreground">Loading...</p>}

      {data && (
        <>
          <section className="rounded-lg border bg-background p-4 shadow-sm" aria-label="Month totals">
            <p className="text-sm text-muted-foreground">You keep</p>
            <p className="text-3xl font-bold text-green-700">{rupees(data.totals.net)}</p>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
              <dt className="text-muted-foreground">Cash collected from customers</dt>
              <dd className="text-right">{rupees(data.totals.collected)}</dd>
              <dt className="text-muted-foreground">Commission to the office</dt>
              <dd className="text-right">- {rupees(data.totals.commission)}</dd>
              <dt className="text-muted-foreground">Jobs completed</dt>
              <dd className="text-right">{data.totals.jobs}</dd>
            </dl>
          </section>

          <section
            className={`rounded-lg border p-4 shadow-sm ${data.balance > 0 ? "border-amber-300 bg-amber-50" : "bg-background"}`}
            aria-label="Balance with the office"
          >
            <p className="text-sm text-muted-foreground">{data.balance > 0 ? "You still owe the office" : data.balance < 0 ? "The office owes you" : "Nothing owed"}</p>
            <p className="text-2xl font-bold">{rupees(Math.abs(data.balance))}</p>
            <p className="mt-1 text-xs text-muted-foreground">All time, across every month.</p>
          </section>

          <section aria-label="Jobs this month">
            <h2 className="mb-2 font-semibold">Jobs</h2>
            {data.jobs.length === 0 ? (
              <p className="rounded-lg border bg-background p-4 text-center text-sm text-muted-foreground">No completed jobs this month.</p>
            ) : (
              <ul className="grid gap-2">
                {data.jobs.map((j) => (
                  <li key={j.id}>
                    <Link href={`/technician/jobs/${j.id}`} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{j.serviceType}</p>
                        <p className="text-xs text-muted-foreground">
                          {j.bookingRef} · {dayLabel(j.completedAt)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{rupees(j.collected)}</p>
                        <p className="text-xs text-muted-foreground">Commission {rupees(j.commission)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Payments">
            <h2 className="mb-2 font-semibold">Recent payments and adjustments</h2>
            {data.settlements.length === 0 ? (
              <p className="rounded-lg border bg-background p-4 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="grid gap-2">
                {data.settlements.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm shadow-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{TYPE_LABEL[s.type]}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayLabel(s.createdAt)}
                        {s.note ? ` · ${s.note}` : ""}
                      </p>
                    </div>
                    <p className="font-medium">
                      {s.amount < 0 ? "-" : "+"} {rupees(Math.abs(s.amount))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
