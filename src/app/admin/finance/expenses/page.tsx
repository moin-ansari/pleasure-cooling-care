"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RangeSelector, { rangeQuery, type RangeValue } from "@/components/custom/admin/RangeSelector";
import { EmptyState, ListSkeleton, PageTitle, Panel } from "@/components/custom/admin/ui";
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
    setList(null);
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
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Expenses and ad spend" sub={<Link href="/admin/finance" className="text-blue-700 underline">Back to Money</Link>} />

      <Panel title="Add an entry" className="mb-3">
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <label htmlFor="type" className="text-xs font-medium">
              Kind
            </label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as "EXPENSE" | "AD_SPEND")} className="h-11 rounded-md border bg-background px-3 text-sm">
              <option value="EXPENSE">Expense</option>
              <option value="AD_SPEND">Ad spend</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label htmlFor="category" className="text-xs font-medium">
              Category
            </label>
            <Input id="category" list="category-hints" className="h-11" value={category} onChange={(e) => setCategory(e.target.value)} required maxLength={60} />
            <datalist id="category-hints">
              {CATEGORY_HINTS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-1">
            <label htmlFor="exp-amount" className="text-xs font-medium">
              Amount (₹)
            </label>
            <Input id="exp-amount" type="number" inputMode="decimal" step="0.01" min={0} className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <label htmlFor="exp-date" className="text-xs font-medium">
              Date
            </label>
            <Input id="exp-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <label htmlFor="exp-ref" className="text-xs font-medium">
              Booking reference (optional)
            </label>
            <Input id="exp-ref" className="h-11" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} maxLength={20} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="exp-note" className="text-xs font-medium">
              Note (optional)
            </label>
            <Input id="exp-note" className="h-11" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="mb-2">
        <RangeSelector value={range} onChange={changeRange} />
      </div>

      {list && (
        <p className="mb-2 text-sm text-muted-foreground">
          Expenses <strong className="text-foreground">{rupees(list.totals.expense)}</strong> · Ad spend <strong className="text-foreground">{rupees(list.totals.adSpend)}</strong>
        </p>
      )}

      {!list ? (
        <ListSkeleton rows={3} />
      ) : list.items.length === 0 ? (
        <EmptyState title="Nothing recorded in this period" />
      ) : (
        <ul className="grid gap-2">
          {list.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-2 rounded-xl border bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {i.category} <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${i.type === "AD_SPEND" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"}`}>{i.type === "AD_SPEND" ? "Ad spend" : "Expense"}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {i.date}
                  {i.bookingId && (
                    <>
                      {" · "}
                      <Link href={`/admin/bookings/${i.bookingId}`} className="text-blue-700 underline">
                        {i.bookingRef}
                      </Link>
                    </>
                  )}
                  {i.note ? ` · ${i.note}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="font-bold text-slate-900">{rupees(i.amount)}</span>
                <button onClick={() => remove(i.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={`Delete ${i.category} on ${i.date}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {list && list.pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
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
    </div>
  );
}
