import React from "react";
import { MapPin, User } from "lucide-react";
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import { RowCard } from "@/components/custom/admin/ui";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { AdminBookingListItem } from "@/lib/domain/adminBookings";

function waited(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} d`;
}

// One booking as a card: the visit time leads because that is what the admin plans around.
export default function BookingCard({ b, overdue }: { b: AdminBookingListItem; overdue?: boolean }) {
  const alert = b.isStale || overdue;
  return (
    <RowCard href={`/admin/bookings/${b.id}`} tone={alert ? "alert" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-5 ${alert ? "text-red-700" : "text-blue-800"}`}>
            {friendlyDay(b.date)}, {b.time}
            {overdue && <span className="ml-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Overdue</span>}
          </p>
          <p className="truncate text-sm font-medium text-slate-900">
            {b.serviceType} <span className="font-normal text-slate-500">· {CATEGORY_LABELS[b.applianceCategory]}</span>
          </p>
        </div>
        <AdminStatusBadge status={b.status} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          {b.customerName}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {b.town}, {b.district}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
        <span className={b.technicianName ? "text-slate-700" : "font-medium text-amber-700"}>{b.technicianName ? `Technician: ${b.technicianName}` : "No technician yet"}</span>
        <span className="flex items-center gap-2 text-slate-500">
          {b.status === "NEW" && <span className={b.isStale ? "font-semibold text-red-700" : ""}>Waiting {waited(b.createdAt)}</span>}
          <span className="font-semibold text-slate-800">₹{b.price}</span>
        </span>
      </div>
    </RowCard>
  );
}
