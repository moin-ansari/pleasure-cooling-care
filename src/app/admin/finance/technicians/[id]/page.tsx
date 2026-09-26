"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ListSkeleton, PageTitle, Panel } from "@/components/custom/admin/ui";
import { rupees } from "@/lib/money";
import type { TechnicianLedger } from "@/lib/domain/finance";

const TYPE_LABEL: Record<string, string> = {
  COMMISSION_OWED: "Commission",
  OFFICE_PAYMENT: "Paid at office",
  PAYOUT: "Deducted from payout",
  ADJUSTMENT: "Adjustment",
};

const KINDS = [
  { value: "OFFICE_PAYMENT", label: "Technician paid at the office" },
  { value: "PAYOUT", label: "Deducted from a payout" },
  { value: "ADJUSTMENT", label: "Adjustment (add or subtract)" },
];

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function TechnicianLedgerPage({ params }: { params: { id: string } }) {
  const [ledger, setLedger] = useState<TechnicianLedger | null>(null);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("OFFICE_PAYMENT");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/finance/technicians/${params.id}?page=${page}`);
      const json = await res.json();
      if (json.status === "success") setLedger(json.data);
      else toast.error(json.message || "Could not load");
    } catch {
      toast.error("Could not load");
    }
  }, [params.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Enter an amount above zero");
    // Adjustments: adding means the technician owes more (positive), subtracting means less.
    const signed = kind === "ADJUSTMENT" && direction === "subtract" ? -value : value;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/finance/technicians/${params.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amount: signed, note: note || undefined }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success("Recorded");
        setAmount("");
        setNote("");
        if (page === 1) await load();
        else setPage(1);
      } else toast.error(json.message || "Could not record");
    } catch {
      toast.error("Could not record");
    } finally {
      setSaving(false);
    }
  };

  if (!ledger) return <ListSkeleton rows={3} />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={ledger.technician.name}
        sub={
          <>
            <Link href="/admin/finance" className="text-blue-700 underline">
              Money
            </Link>{" "}
            · {ledger.technician.phone}
          </>
        }
      />

      <div className={`mb-3 rounded-xl border p-3 ${ledger.balance > 0 ? "border-amber-300 bg-amber-50" : "bg-white"}`}>
        <p className="text-xs text-slate-600">{ledger.balance > 0 ? "Owes the office" : ledger.balance < 0 ? "Office owes them" : "Settled"}</p>
        <p className={`text-2xl font-bold ${ledger.balance > 0 ? "text-red-700" : ""}`}>{rupees(Math.abs(ledger.balance))}</p>
      </div>

      <Panel title="Record a payment" className="mb-3">
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <label htmlFor="kind" className="text-xs font-medium">
              What happened
            </label>
            <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-11 rounded-md border bg-background px-3 text-sm">
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label htmlFor="amount" className="text-xs font-medium">
              Amount (₹)
            </label>
            <Input id="amount" type="number" inputMode="decimal" step="0.01" min={0} className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          {kind === "ADJUSTMENT" && (
            <div className="grid gap-1">
              <label htmlFor="direction" className="text-xs font-medium">
                Effect
              </label>
              <select id="direction" value={direction} onChange={(e) => setDirection(e.target.value as "add" | "subtract")} className="h-11 rounded-md border bg-background px-3 text-sm">
                <option value="add">Technician owes more</option>
                <option value="subtract">Technician owes less</option>
              </select>
            </div>
          )}
          <div className={`grid gap-1 ${kind === "ADJUSTMENT" ? "" : "sm:col-span-2"}`}>
            <label htmlFor="note" className="text-xs font-medium">
              Note {kind === "ADJUSTMENT" ? "(required)" : "(optional)"}
            </label>
            <Input id="note" className="h-11" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} required={kind === "ADJUSTMENT"} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Record"}
            </Button>
          </div>
        </form>
      </Panel>

      <h2 className="mb-2 text-sm font-semibold text-slate-800">Ledger</h2>
      {ledger.items.length === 0 ? (
        <EmptyState title="Nothing yet" text="Commission appears here when a job is completed." />
      ) : (
        <ul className="grid gap-2">
          {ledger.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-2 rounded-xl border bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{TYPE_LABEL[i.type]}</p>
                <p className="text-xs text-slate-500">
                  {when(i.createdAt)}
                  {i.bookingId && (
                    <>
                      {" · "}
                      <Link href={`/admin/bookings/${i.bookingId}`} className="text-blue-700 underline">
                        {i.bookingRef}
                      </Link>
                    </>
                  )}
                </p>
                {i.note && <p className="text-xs text-slate-600">{i.note}</p>}
              </div>
              <p className={`shrink-0 font-bold ${i.amount < 0 ? "text-emerald-700" : "text-slate-900"}`}>
                {i.amount < 0 ? "−" : "+"} {rupees(Math.abs(i.amount))}
              </p>
            </li>
          ))}
        </ul>
      )}

      {ledger.pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {ledger.pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= ledger.pageCount} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
