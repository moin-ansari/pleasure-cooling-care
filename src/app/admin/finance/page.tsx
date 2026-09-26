"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Banknote, Megaphone, PiggyBank, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RangeSelector, { rangeQuery, type RangeValue } from "@/components/custom/admin/RangeSelector";
import { EmptyState, ListSkeleton, PageTitle, Panel, RowCard, StatTile } from "@/components/custom/admin/ui";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { istDateString } from "@/lib/time";
import { rupees } from "@/lib/money";
import type { FinanceSummary } from "@/lib/domain/finance";

export default function FinancePage() {
  const today = istDateString();
  const [range, setRange] = useState<RangeValue>({ preset: "this_month", from: today, to: today });
  const { me } = useAdmin();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    fetch(`/api/admin/finance/summary?${rangeQuery(range)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") setSummary(json.data.summary);
        else toast.error(json.message || "Could not load finance");
      })
      .catch(() => !cancelled && toast.error("Could not load finance"));
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div>
      <PageTitle
        title="Money"
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/finance/expenses">Expenses</Link>
          </Button>
        }
      />

      <div className="mb-3">
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {!summary ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <StatTile label="Profit" value={rupees(summary.profit)} note={summary.viewer === "OWNER" ? "Your income − costs − ads" : "Your share − store costs"} Icon={PiggyBank} tone={summary.profit >= 0 ? "green" : "red"} />
            <StatTile label={summary.viewer === "OWNER" ? "Your income" : "Your share"} value={rupees(summary.income)} note={summary.viewer === "OWNER" ? `Of ${rupees(summary.commissionEarned)} technicians paid` : `Of ${rupees(summary.commissionEarned)} technicians paid`} Icon={TrendingUp} tone="blue" />
            <StatTile label="Technicians owe" value={rupees(summary.outstandingCommission)} note="Still to pay in to the store" Icon={Wallet} tone={summary.outstandingCommission > 0 ? "amber" : "slate"} />
            {summary.stores.some((s) => !s.isMain) && (
              <StatTile label={summary.viewer === "OWNER" ? "Stores owe you" : "Your store owes the owner"} value={rupees(summary.owedToOwner)} note="Owner's share not yet paid" Icon={Wallet} tone={summary.owedToOwner > 0 ? "amber" : "slate"} href={summary.viewer === "OWNER" ? "/admin/stores" : me?.store ? `/admin/stores/${me.store.id}` : undefined} />
            )}
            <StatTile label="Cash collected" value={rupees(summary.sales.collected)} note={`${summary.sales.jobs} jobs · parts ${rupees(summary.sales.parts)}`} Icon={Banknote} />
            <StatTile label="Expenses" value={rupees(summary.expenses)} Icon={Receipt} href="/admin/finance/expenses" />
            <StatTile
              label="Ad spend"
              value={rupees(summary.adSpend)}
              note={summary.ads.costPerAdBooking !== null ? `${rupees(summary.ads.costPerAdBooking)} per ad booking · ${summary.ads.bookingsFromAds}/${summary.ads.totalBookings} from ads` : `${summary.ads.bookingsFromAds}/${summary.ads.totalBookings} bookings from ads`}
              Icon={Megaphone}
              href="/admin/finance/expenses"
            />
          </div>

          {(summary.viewer === "OWNER" ? summary.stores.length > 1 : summary.stores.some((s) => !s.isMain)) && (
            <Panel title="By store">
              <ul className="grid gap-2">
                {summary.stores.map((s) => (
                  <li key={s.storeId} className="rounded-lg border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {s.name} {s.isMain && <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-800">Yours</span>}
                      </p>
                      {!s.isMain && s.owesOwner > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Owes {rupees(s.owesOwner)}</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {s.jobs} jobs · technicians paid {rupees(s.commission)}
                      {!s.isMain && <> · owner {rupees(s.ownerShare)} · store keeps {rupees(s.storeKeeps)}</>}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="By technician">
            {summary.technicians.length === 0 ? (
              <EmptyState title="Nothing in this period" text="Completed jobs and payments will show here." />
            ) : (
              <>
                <div className="grid gap-2 lg:hidden">
                  {summary.technicians.map((t) => (
                    <RowCard key={t.technicianId} href={`/admin/finance/technicians/${t.technicianId}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-slate-900">{t.name}</p>
                        <p className={`shrink-0 text-sm font-bold ${t.balance > 0 ? "text-red-700" : "text-slate-700"}`}>{t.balance > 0 ? `Owes ${rupees(t.balance)}` : rupees(t.balance)}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {t.jobs} jobs · collected {rupees(t.collected)} · commission {rupees(t.commission)}
                      </p>
                    </RowCard>
                  ))}
                </div>
                <div className="hidden lg:block">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[30%] p-2">Technician</TableHead>
                        <TableHead className="w-[10%] p-2 text-right">Jobs</TableHead>
                        <TableHead className="w-[20%] p-2 text-right">Cash collected</TableHead>
                        <TableHead className="w-[20%] p-2 text-right">Commission</TableHead>
                        <TableHead className="w-[20%] p-2 text-right">Owes you now</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.technicians.map((t) => (
                        <TableRow key={t.technicianId}>
                          <TableCell className="p-2 font-medium">
                            <Link href={`/admin/finance/technicians/${t.technicianId}`} className="hover:underline">
                              {t.name}
                            </Link>
                          </TableCell>
                          <TableCell className="p-2 text-right">{t.jobs}</TableCell>
                          <TableCell className="p-2 text-right">{rupees(t.collected)}</TableCell>
                          <TableCell className="p-2 text-right">{rupees(t.commission)}</TableCell>
                          <TableCell className={`p-2 text-right font-medium ${t.balance > 0 ? "text-red-700" : ""}`}>{rupees(t.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Panel>

          <p className="text-xs text-slate-500">
            Commission terms are per store, on the{" "}
            <Link href="/admin/stores" className="text-blue-700 underline">
              Stores
            </Link>{" "}
            screen.
          </p>
        </div>
      )}
    </div>
  );
}
