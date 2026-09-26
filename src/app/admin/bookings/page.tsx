"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import BookingCard from "@/components/custom/admin/BookingCard";
import { Chips, EmptyState, ListSkeleton, PageTitle } from "@/components/custom/admin/ui";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { BOOKING_GROUPS, BOOKING_GROUP_LABELS, type BookingGroup } from "@/constants/booking";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { AdminBookingList } from "@/lib/domain/adminBookings";

export default function BookingsPage() {
  const router = useRouter();
  const [group, setGroup] = useState<BookingGroup>("new");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminBookingList | null>(null);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    const params = new URLSearchParams({ group, page: String(page), ...(search ? { q: search } : {}) });
    fetch(`/api/admin/bookings?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") setData(json.data);
        else toast.error(json.message || "Could not load bookings");
      })
      .catch(() => !cancelled && toast.error("Could not load bookings"));
    return () => {
      cancelled = true;
    };
  }, [group, search, page]);

  const pick = (g: BookingGroup) => {
    setGroup(g);
    setPage(1);
  };

  return (
    <div>
      <PageTitle title="Bookings" sub={data ? `${data.total} ${BOOKING_GROUP_LABELS[group].toLowerCase()}` : undefined} />

      <div className="relative mb-2">
        <label htmlFor="booking-search" className="sr-only">
          Search bookings
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input id="booking-search" className="h-11 bg-white pl-9" placeholder="Search name, phone or reference" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mb-3">
        <Chips
          label="Booking status"
          value={group}
          onChange={pick}
          options={BOOKING_GROUPS.map((g) => ({ key: g, label: BOOKING_GROUP_LABELS[g], count: data?.counts[g] }))}
        />
      </div>

      {data === null ? (
        <ListSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState title={search ? "No bookings match your search" : "Nothing here yet"} />
      ) : (
        <>
          {/* Phone and tablet: one card per booking, earliest visit first. */}
          <div className="grid gap-2 md:grid-cols-2 lg:hidden">
            {data.items.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </div>

          {/* Large screens: a table. */}
          <div className="hidden rounded-xl border bg-white shadow-sm lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[12%] p-2">When</TableHead>
                  <TableHead className="w-[18%] p-2">Customer</TableHead>
                  <TableHead className="w-[20%] p-2">Service</TableHead>
                  <TableHead className="w-[16%] p-2">Area</TableHead>
                  <TableHead className="w-[14%] p-2">Technician</TableHead>
                  <TableHead className="w-[8%] p-2 text-right">Price</TableHead>
                  <TableHead className="w-[12%] p-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((b) => (
                  <TableRow key={b.id} className={`cursor-pointer ${b.isStale ? "bg-red-50 hover:bg-red-100" : ""}`} onClick={() => router.push(`/admin/bookings/${b.id}`)}>
                    <TableCell className="p-2">
                      <div className="font-medium">{friendlyDay(b.date)}</div>
                      <div className="text-xs text-muted-foreground">{b.time}</div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="truncate font-medium">{b.customerName}</div>
                      <div className="text-xs text-muted-foreground">{b.mobile}</div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="truncate">{b.serviceType}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {CATEGORY_LABELS[b.applianceCategory]}, {b.applianceSubType}
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="truncate">{b.town}</div>
                      <div className="text-xs text-muted-foreground">{b.district}</div>
                    </TableCell>
                    <TableCell className="truncate p-2">{b.technicianName ?? <span className="text-amber-700">Not assigned</span>}</TableCell>
                    <TableCell className="p-2 text-right">₹{b.price}</TableCell>
                    <TableCell className="p-2">
                      <AdminStatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
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
    </div>
  );
}
