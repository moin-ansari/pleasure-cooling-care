"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RangeSelector, { rangeQuery, type RangeValue } from "@/components/custom/admin/RangeSelector";
import { istDateString } from "@/lib/time";
import { rupees } from "@/lib/money";
import type { FinanceSummary } from "@/lib/domain/finance";

interface Loaded {
  summary: FinanceSummary;
  commission: { ratePercent: number; flatAmount: number };
}

function Stat({ title, value, note, tone }: { title: string; value: React.ReactNode; note?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <div className={`text-2xl font-bold ${tone === "good" ? "text-green-700" : tone === "bad" ? "text-red-700" : ""}`}>{value}</div>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </CardContent>
    </Card>
  );
}

export default function FinancePage() {
  const router = useRouter();
  const today = istDateString();
  const [range, setRange] = useState<RangeValue>({ preset: "this_month", from: today, to: today });
  const [data, setData] = useState<Loaded | null>(null);
  const [rate, setRate] = useState("");
  const [flat, setFlat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/finance/summary?${rangeQuery(range)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") {
          setData({ summary: json.data.summary, commission: json.data.commission });
          setRate((r) => r || String(json.data.commission.ratePercent));
          setFlat((f) => f || String(json.data.commission.flatAmount));
        } else toast.error(json.message || "Could not load finance");
      })
      .catch(() => !cancelled && toast.error("Could not load finance"));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const saveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/commission", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRatePercent: Number(rate), commissionFlatAmount: Number(flat) }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        setData((d) => (d ? { ...d, commission: json.data } : d));
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="p-3 h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>;
  const s = data.summary;

  return (
    <div className="p-3 w-full max-w-6xl mx-auto grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Finance</h1>
        <Button asChild variant="outline">
          <Link href="/admin/finance/expenses">Expenses and ad spend</Link>
        </Button>
      </div>

      <RangeSelector value={range} onChange={setRange} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Sales (cash collected)" value={rupees(s.sales.collected)} note={`${s.sales.jobs} completed jobs. Service ${rupees(s.sales.labor)}, parts ${rupees(s.sales.parts)}`} />
        <Stat title="Your commission" value={rupees(s.commissionEarned)} note="Earned from technicians' jobs" />
        <Stat title="Expenses + ad spend" value={rupees(s.expenses + s.adSpend)} note={`Expenses ${rupees(s.expenses)}, ads ${rupees(s.adSpend)}`} />
        <Stat title="Profit" value={rupees(s.profit)} note="Commission minus expenses and ad spend" tone={s.profit >= 0 ? "good" : "bad"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Owed to you now" value={rupees(s.outstandingCommission)} note="Commission technicians still have to pay in (all time)" tone={s.outstandingCommission > 0 ? "bad" : undefined} />
        <Stat
          title="Bookings from ads"
          value={`${s.ads.bookingsFromAds} of ${s.ads.totalBookings}`}
          note={s.ads.costPerAdBooking !== null ? `${rupees(s.ads.costPerAdBooking)} ad spend per ad booking` : "Tagged with a campaign link"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By technician</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {s.technicians.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No completed jobs or ledger entries in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-accent">
                  <TableHead className="p-2">Technician</TableHead>
                  <TableHead className="p-2 text-right">Jobs</TableHead>
                  <TableHead className="p-2 text-right">Cash collected</TableHead>
                  <TableHead className="p-2 text-right">Your commission</TableHead>
                  <TableHead className="p-2 text-right">Owes you now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.technicians.map((t) => (
                  <TableRow key={t.technicianId} className="cursor-pointer" onClick={() => router.push(`/admin/finance/technicians/${t.technicianId}`)}>
                    <TableCell className="p-2 font-medium">{t.name}</TableCell>
                    <TableCell className="p-2 text-right">{t.jobs}</TableCell>
                    <TableCell className="p-2 text-right">{rupees(t.collected)}</TableCell>
                    <TableCell className="p-2 text-right">{rupees(t.commission)}</TableCell>
                    <TableCell className={`p-2 text-right font-medium ${t.balance > 0 ? "text-red-700" : ""}`}>{rupees(t.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={saveCommission} className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="rate" className="text-sm font-medium">
                Percentage of the service charge
              </label>
              <Input id="rate" type="number" step="0.01" min={0} max={100} value={rate} onChange={(e) => setRate(e.target.value)} className="w-40" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="flat" className="text-sm font-medium">
                Flat amount per job (₹)
              </label>
              <Input id="flat" type="number" step="0.01" min={0} value={flat} onChange={(e) => setFlat(e.target.value)} className="w-40" />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            Applies to jobs completed from now on. Jobs already completed keep the terms they were completed under. Free guarantee re-services earn no commission. Parts are never charged commission.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
