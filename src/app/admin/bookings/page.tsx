"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import BookingCard from "@/components/custom/admin/BookingCard";
import SchedulePanel from "@/components/custom/admin/SchedulePanel";
import CategoryTabs from "@/components/custom/CategoryTabs";
import { CATEGORY_ICONS, CATEGORY_TAB_LABELS, CATEGORY_TONE } from "@/components/custom/categoryIcons";
import { Chips, EmptyState, ListSkeleton, PageTitle } from "@/components/custom/admin/ui";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { BOOKING_GROUPS, BOOKING_GROUP_LABELS, type BookingGroup } from "@/constants/booking";
import { CATEGORY_LABELS, type CategoryFilter } from "@/constants/appliances";
import type { AdminBookingList } from "@/lib/domain/adminBookings";

export default function BookingsPage() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "schedule">("list");
  const [group, setGroup] = useState<BookingGroup>("new");
  const [category, setCategory] = useState<CategoryFilter>("all");
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
    const params = new URLSearchParams({ group, category, page: String(page), ...(search ? { q: search } : {}) });
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
  }, [group, category, search, page]);

  const pick = (g: BookingGroup) => {
    setGroup(g);
    setPage(1);
  };

  const pickCategory = (c: CategoryFilter) => {
    setCategory(c);
    setPage(1);
  };

  return (
    <div>
      <PageTitle
        title="Bookings"
        sub={view === "list" && data ? `${data.total} ${BOOKING_GROUP_LABELS[group].toLowerCase()}` : undefined}
        action={
          <Button asChild size="sm">
            <Link href="/admin/bookings/new">
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> New
            </Link>
          </Button>
        }
      />

      <div className="mb-3">
        <Chips<"list" | "schedule"> label="View" value={view} onChange={setView} options={[{ key: "list", label: "List" }, { key: "schedule", label: "Schedule" }]} />
      </div>

      {view === "schedule" ? (
        <SchedulePanel />
      ) : (
      <>

      <div className="relative mb-2">
        <label htmlFor="booking-search" className="sr-only">
          Search bookings
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input id="booking-search" className="h-11 bg-white pl-9" placeholder="Search name, phone or reference" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <CategoryTabs value={category} counts={data?.categoryCounts} onChange={pickCategory} />

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
        <EmptyState title={search ? "No bookings match your search" : category !== "all" ? `No ${CATEGORY_TAB_LABELS[category].toLowerCase()} bookings here` : "Nothing here yet"} />
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
                {data.items.map((b) => {
                  const CatIcon = CATEGORY_ICONS[b.applianceCategory];
                  return (
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
                      <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${CATEGORY_TONE[b.applianceCategory]}`}>
                          <CatIcon className="h-2.5 w-2.5" aria-hidden="true" />
                        </span>
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
                  );
                })}
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
      </>
      )}
    </div>
  );
}
