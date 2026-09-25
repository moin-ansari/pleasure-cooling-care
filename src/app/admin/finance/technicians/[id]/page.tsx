"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

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

  if (!ledger) return <div className="p-3 h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 w-full max-w-4xl mx-auto grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/finance" className="text-sm text-muted-foreground hover:underline">
            ← Finance
          </Link>
          <h1 className="text-xl font-semibold">{ledger.technician.name}</h1>
          <p className="text-sm text-muted-foreground">{ledger.technician.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{ledger.balance > 0 ? "Owes the office" : ledger.balance < 0 ? "Office owes them" : "Settled"}</p>
          <p className={`text-2xl font-bold ${ledger.balance > 0 ? "text-red-700" : ""}`}>{rupees(Math.abs(ledger.balance))}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record a payment</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="kind" className="text-sm font-medium">
                What happened
              </label>
              <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (₹)
              </label>
              <Input id="amount" type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            {kind === "ADJUSTMENT" && (
              <div className="grid gap-1.5">
                <label htmlFor="direction" className="text-sm font-medium">
                  Effect
                </label>
                <select id="direction" value={direction} onChange={(e) => setDirection(e.target.value as "add" | "subtract")} className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="add">Technician owes more</option>
                  <option value="subtract">Technician owes less</option>
                </select>
              </div>
            )}
            <div className={`grid gap-1.5 ${kind === "ADJUSTMENT" ? "" : "sm:col-span-2"}`}>
              <label htmlFor="note" className="text-sm font-medium">
                Note {kind === "ADJUSTMENT" ? "(required)" : "(optional)"}
              </label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} required={kind === "ADJUSTMENT"} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {ledger.items.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Nothing yet. Commission appears here when a job is completed.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-accent">
                  <TableHead className="p-2">When</TableHead>
                  <TableHead className="p-2">Type</TableHead>
                  <TableHead className="p-2">Details</TableHead>
                  <TableHead className="p-2 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="p-2 whitespace-nowrap">{when(i.createdAt)}</TableCell>
                    <TableCell className="p-2">{TYPE_LABEL[i.type]}</TableCell>
                    <TableCell className="p-2 text-sm">
                      {i.bookingId && (
                        <Link href={`/admin/bookings/${i.bookingId}`} className="underline mr-2">
                          {i.bookingRef}
                        </Link>
                      )}
                      <span className="text-muted-foreground">{i.note}</span>
                    </TableCell>
                    <TableCell className={`p-2 text-right font-medium ${i.amount < 0 ? "text-green-700" : ""}`}>
                      {i.amount < 0 ? "-" : "+"} {rupees(Math.abs(i.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {ledger.pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
