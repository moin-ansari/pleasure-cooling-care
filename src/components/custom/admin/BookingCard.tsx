"use client";
import React from "react";
import { MapPin, User } from "lucide-react";
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { CATEGORY_ICONS, CATEGORY_TONE } from "@/components/custom/categoryIcons";
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
  const { me } = useAdmin();
  const alert = b.isStale || overdue || b.reassignRequested;
  // The owner sees which store a booking belongs to once there is more than one store.
  const showStore = !!me?.isOwner && new Set(me.cities.map((c) => c.id)).size > 1;
  const CatIcon = CATEGORY_ICONS[b.applianceCategory];
  return (
    <RowCard href={`/admin/bookings/${b.id}`} tone={alert ? "alert" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${CATEGORY_TONE[b.applianceCategory]}`}>
            <CatIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold leading-5 ${alert ? "text-red-700" : "text-blue-800"}`}>
              {friendlyDay(b.date)}, {b.time}
              {overdue && <span className="ml-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Overdue</span>}
            </p>
            <p className="text-sm font-medium leading-tight text-slate-900">
              {b.serviceType} <span className="font-normal text-slate-500">· {CATEGORY_LABELS[b.applianceCategory]}</span>
            </p>
          </div>
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
        {showStore && <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-600">{b.storeName}</span>}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
        <span className={b.technicianName ? "text-slate-700" : "font-medium text-amber-700"}>
          {b.technicianName ? `Technician: ${b.technicianName}` : "No technician yet"}
          {b.reassignRequested && <span className="ml-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Cannot attend</span>}
        </span>
        <span className="flex items-center gap-2 text-slate-500">
          {b.status === "NEW" && <span className={b.isStale ? "font-semibold text-red-700" : ""}>Waiting {waited(b.createdAt)}</span>}
          <span className="font-semibold text-slate-800">₹{b.price}</span>
        </span>
      </div>
    </RowCard>
  );
}
