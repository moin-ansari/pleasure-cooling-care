"use client";
import React from "react";
import { MapPin } from "lucide-react";
import { useAdmin } from "@/components/custom/admin/AdminContext";

// Beside today's date on Home. Limits every admin screen to one city. Owner: All or any city. Co-admin: their own cities.
export default function CitySwitcher() {
  const { me, cityId, setCityId } = useAdmin();
  if (!me) return <span className="h-8 w-28 animate-pulse rounded-full bg-slate-200" aria-hidden="true" />;

  const allLabel = me.isOwner ? "All" : me.store?.name ?? "All";

  if (!me.isOwner && me.cities.length <= 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700">
        <MapPin className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
        {me.store?.name ?? me.cities[0]?.district ?? "Store"}
      </span>
    );
  }

  return (
    <label className="inline-flex items-center gap-1 rounded-full border bg-white pl-3 pr-1 text-xs font-medium text-slate-700">
      <MapPin className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
      <span className="sr-only">Show</span>
      <select
        value={cityId ?? ""}
        onChange={(e) => setCityId(e.target.value || null)}
        className="h-8 max-w-[9.5rem] cursor-pointer rounded-full bg-transparent py-0 pl-1 pr-2 text-xs font-medium focus:outline-none"
        aria-label="Show bookings, technicians and money for"
      >
        <option value="">{allLabel}</option>
        {me.cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.district}
          </option>
        ))}
      </select>
    </label>
  );
}
