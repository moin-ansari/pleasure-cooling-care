"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Ban, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { Chips, EmptyState, ListSkeleton, PageTitle, RowCard } from "@/components/custom/admin/ui";
import { rupees } from "@/lib/money";
import type { BlockedItem, CustomerList } from "@/lib/domain/customers";

type View = "all" | "blocked";
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default function CustomersPage() {
  const { me } = useAdmin();
  const isOwner = me?.isOwner ?? false;
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerList | null>(null);
  const [blocked, setBlocked] = useState<BlockedItem[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (view !== "all") return;
    let cancelled = false;
    setData(null);
    const params = new URLSearchParams({ page: String(page), ...(search ? { q: search } : {}) });
    fetch(`/api/admin/customers?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") setData(json.data);
        else toast.error(json.message || "Could not load customers");
      })
      .catch(() => !cancelled && toast.error("Could not load customers"));
    return () => {
      cancelled = true;
    };
  }, [view, search, page]);

  const loadBlocked = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers/blocked");
      const json = await res.json();
      if (json.status === "success") setBlocked(json.data);
      else toast.error(json.message || "Could not load blocked numbers");
    } catch {
      toast.error("Could not load blocked numbers");
    }
  }, []);

  useEffect(() => {
    if (view === "blocked") loadBlocked();
  }, [view, loadBlocked]);

  const unblock = async (mobile: string) => {
    if (!window.confirm(`Let ${mobile} book again?`)) return;
    try {
      const res = await fetch(`/api/admin/customers/${mobile}/block`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        await loadBlocked();
      } else toast.error(json.message || "Could not unblock");
    } catch {
      toast.error("Could not unblock");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Customers" sub={view === "all" && data ? `${data.total} ${data.total === 1 ? "customer" : "customers"}` : undefined} />

      {isOwner && (
        <div className="mb-3">
          <Chips<View> label="Show" value={view} onChange={setView} options={[{ key: "all", label: "All customers" }, { key: "blocked", label: "Blocked numbers", count: blocked?.length }]} />
        </div>
      )}

      {view === "all" ? (
        <>
          <div className="relative mb-3">
            <label htmlFor="customer-search" className="sr-only">
              Search customers
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input id="customer-search" className="h-11 bg-white pl-9" placeholder="Search name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {!data ? (
            <ListSkeleton />
          ) : data.items.length === 0 ? (
            <EmptyState title={search ? "No customers match your search" : "No customers yet"} text={search ? undefined : "Customers appear here after their first booking."} />
          ) : (
            <ul className="grid gap-2">
              {data.items.map((c) => (
                <li key={c.mobile}>
                  <RowCard href={`/admin/customers/${c.mobile}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.mobile}</p>
                      </div>
                      {c.isBlocked && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          <Ban className="h-3 w-3" aria-hidden="true" /> Blocked
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {c.bookings} {c.bookings === 1 ? "booking" : "bookings"} · paid {rupees(c.spent)} · last {when(c.lastBookingAt)}
                    </p>
                  </RowCard>
                </li>
              ))}
            </ul>
          )}

          {data && data.pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {data.pageCount}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.pageCount} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      ) : !blocked ? (
        <ListSkeleton rows={2} />
      ) : blocked.length === 0 ? (
        <EmptyState title="No blocked numbers" text="To block a number, open the customer and choose Block. Blocked numbers cannot book." />
      ) : (
        <ul className="grid gap-2">
          {blocked.map((b) => (
            <li key={b.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{b.name ?? b.mobile}</p>
                  <p className="text-xs text-slate-500">
                    {b.mobile} · blocked {when(b.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => unblock(b.mobile)}>
                  Unblock
                </Button>
              </div>
              {b.reason && <p className="mt-1 text-sm text-slate-700">{b.reason}</p>}
              {b.name && (
                <Link href={`/admin/customers/${b.mobile}`} className="mt-1 inline-block text-xs text-blue-700 underline">
                  Open customer
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
