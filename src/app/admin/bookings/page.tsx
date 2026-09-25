"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { BOOKING_GROUPS, BOOKING_GROUP_LABELS, type BookingGroup } from "@/constants/booking";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { AdminBookingList } from "@/lib/domain/adminBookings";

function waited(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} d`;
}

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
    <div className="p-3 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 className="text-xl font-semibold">Bookings</h1>
        <div className="w-full sm:w-72">
          <label htmlFor="booking-search" className="sr-only">
            Search bookings
          </label>
          <Input id="booking-search" placeholder="Search name, phone or reference" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div role="tablist" aria-label="Booking status" className="flex flex-wrap gap-2 mb-3">
        {BOOKING_GROUPS.map((g) => (
          <Button key={g} role="tab" aria-selected={group === g} size="sm" variant={group === g ? "default" : "outline"} onClick={() => pick(g)}>
            {BOOKING_GROUP_LABELS[g]}
            {data && <span className="ml-1.5 opacity-80">({data.counts[g]})</span>}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          {data === null ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : data.items.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              {search ? "No bookings match your search." : "Nothing here yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-accent">
                  <TableHead className="p-2">Booking</TableHead>
                  <TableHead className="p-2">Customer</TableHead>
                  <TableHead className="p-2">Service</TableHead>
                  <TableHead className="p-2">When</TableHead>
                  <TableHead className="p-2">Area</TableHead>
                  <TableHead className="p-2">Technician</TableHead>
                  <TableHead className="p-2 text-right">Price</TableHead>
                  <TableHead className="p-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((b) => (
                  <TableRow
                    key={b.id}
                    className={`cursor-pointer ${b.isStale ? "bg-red-50 hover:bg-red-100" : ""}`}
                    onClick={() => router.push(`/admin/bookings/${b.id}`)}
                  >
                    <TableCell className="p-2">
                      <div className="font-mono text-xs">{b.bookingRef}</div>
                      <div className={`text-xs ${b.isStale ? "font-semibold text-red-700" : "text-muted-foreground"}`}>
                        {b.status === "NEW" ? `Waiting ${waited(b.createdAt)}` : `${waited(b.createdAt)} ago`}
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="font-medium">{b.customerName}</div>
                      <div className="text-xs text-muted-foreground">{b.mobile}</div>
                    </TableCell>
                    <TableCell className="p-2">
                      <div>{b.serviceType}</div>
                      <div className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[b.applianceCategory]}, {b.applianceSubType}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 whitespace-nowrap">
                      {friendlyDay(b.date)}
                      <div className="text-xs text-muted-foreground">{b.time}</div>
                    </TableCell>
                    <TableCell className="p-2">
                      {b.town}
                      <div className="text-xs text-muted-foreground">{b.district}</div>
                    </TableCell>
                    <TableCell className="p-2">{b.technicianName ?? <span className="text-muted-foreground">Not assigned</span>}</TableCell>
                    <TableCell className="p-2 text-right">₹{b.price}</TableCell>
                    <TableCell className="p-2">
                      <AdminStatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
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
