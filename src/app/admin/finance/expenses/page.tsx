"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import RangeSelector, { rangeQuery, type RangeValue } from "@/components/custom/admin/RangeSelector";
import { istDateString } from "@/lib/time";
import { rupees } from "@/lib/money";
import type { ExpenseList } from "@/lib/domain/finance";

const CATEGORY_HINTS = ["Google Ads", "Meta Ads", "Spare parts", "Fuel", "Tools", "Salary", "Rent", "Other"];

export default function ExpensesPage() {
  const today = istDateString();
  const [range, setRange] = useState<RangeValue>({ preset: "this_month", from: today, to: today });
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ExpenseList | null>(null);

  const [type, setType] = useState<"EXPENSE" | "AD_SPEND">("EXPENSE");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/finance/expenses?${rangeQuery(range)}&page=${page}`);
      const json = await res.json();
      if (json.status === "success") setList(json.data);
      else toast.error(json.message || "Could not load");
    } catch {
      toast.error("Could not load");
    }
  }, [range, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRange = (v: RangeValue) => {
    setPage(1);
    setRange(v);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, category, amount: Number(amount), date, note: note || undefined, bookingRef: bookingRef || undefined }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success("Saved");
        setAmount("");
        setNote("");
        setBookingRef("");
        await load();
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      const res = await fetch(`/api/admin/finance/expenses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "success") {
        toast.success("Deleted");
        await load();
      } else toast.error(json.message || "Could not delete");
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div className="p-3 w-full max-w-5xl mx-auto grid gap-4">
      <div>
        <Link href="/admin/finance" className="text-sm text-muted-foreground hover:underline">
          ← Finance
        </Link>
        <h1 className="text-xl font-semibold">Expenses and ad spend</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add an entry</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1.5">
              <label htmlFor="type" className="text-sm font-medium">
                Kind
              </label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value as "EXPENSE" | "AD_SPEND")} className="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="EXPENSE">Expense</option>
                <option value="AD_SPEND">Ad spend</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Input id="category" list="category-hints" value={category} onChange={(e) => setCategory(e.target.value)} required maxLength={60} />
              <datalist id="category-hints">
                {CATEGORY_HINTS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="exp-amount" className="text-sm font-medium">
                Amount (₹)
              </label>
              <Input id="exp-amount" type="number" step="0.01" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="exp-date" className="text-sm font-medium">
                Date
              </label>
              <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="exp-ref" className="text-sm font-medium">
                Booking reference (optional)
              </label>
              <Input id="exp-ref" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} maxLength={20} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="exp-note" className="text-sm font-medium">
                Note (optional)
              </label>
              <Input id="exp-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <RangeSelector value={range} onChange={changeRange} />

      {list && (
        <p className="text-sm text-muted-foreground">
          In this period: expenses <strong className="text-foreground">{rupees(list.totals.expense)}</strong>, ad spend <strong className="text-foreground">{rupees(list.totals.adSpend)}</strong>
        </p>
      )}

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {!list ? (
            <p className="p-6 text-center text-muted-foreground">Loading...</p>
          ) : list.items.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Nothing recorded in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-accent">
                  <TableHead className="p-2">Date</TableHead>
                  <TableHead className="p-2">Kind</TableHead>
                  <TableHead className="p-2">Category</TableHead>
                  <TableHead className="p-2">Details</TableHead>
                  <TableHead className="p-2 text-right">Amount</TableHead>
                  <TableHead className="p-2">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="p-2 whitespace-nowrap">{i.date}</TableCell>
                    <TableCell className="p-2">{i.type === "AD_SPEND" ? "Ad spend" : "Expense"}</TableCell>
                    <TableCell className="p-2">{i.category}</TableCell>
                    <TableCell className="p-2 text-sm text-muted-foreground">
                      {i.bookingId && (
                        <Link href={`/admin/bookings/${i.bookingId}`} className="underline mr-2 text-foreground">
                          {i.bookingRef}
                        </Link>
                      )}
                      {i.note}
                    </TableCell>
                    <TableCell className="p-2 text-right font-medium">{rupees(i.amount)}</TableCell>
                    <TableCell className="p-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => remove(i.id)} aria-label={`Delete ${i.category} on ${i.date}`}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {list && list.pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {list.pageCount}
              </span>
              <Button variant="outline" size="sm" disabled={page >= list.pageCount} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
