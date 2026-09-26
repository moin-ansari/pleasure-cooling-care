"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { istLocalToUtc, slotToHHmm } from "@/lib/time";
import type { AdminBookingDetail, AssignableTechnician } from "@/lib/domain/adminBookings";

const toIstLocal = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T").slice(0, 16);

// The customer's requested slot, or half an hour from now when that time has already passed.
function defaultArrival(b: AdminBookingDetail): string {
  if (b.confirmedArrivalAt) return toIstLocal(new Date(b.confirmedArrivalAt));
  const wanted = istLocalToUtc(`${b.date}T${slotToHHmm(b.time)}`);
  const earliest = new Date(Date.now() + 30 * 60000);
  return toIstLocal(wanted > earliest ? wanted : earliest);
}

function Badge({ tone, children }: { tone: "good" | "warn" | "plain"; children: React.ReactNode }) {
  const cls = tone === "good" ? "bg-green-100 text-green-800" : tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

export default function AssignPanel({ booking, onChanged }: { booking: AdminBookingDetail; onChanged: (b: AdminBookingDetail) => void }) {
  const assigned = booking.technician !== null;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<AssignableTechnician[] | null>(null);
  const [selected, setSelected] = useState(booking.technician?.id ?? "");
  const [arrival, setArrival] = useState(() => defaultArrival(booking));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const openPanel = async () => {
    setOpen(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/assignable`);
      const json = await res.json();
      if (json.status === "success") setList(json.data);
      else setError(json.message || "Could not load technicians");
    } catch {
      setError("Could not load technicians");
    }
  };

  const submit = async (acknowledgeOff = false): Promise<void> => {
    if (!selected) {
      setError("Choose a technician");
      return;
    }
    // Only the owner ever sees another store's technician here. The job then earns for that store.
    const chosen = list?.find((t) => t.id === selected);
    if (chosen && !chosen.sameStore && !window.confirm(`${chosen.name} belongs to ${chosen.storeName}. The booking will move to ${chosen.storeName}, and that store earns from it. Continue?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: selected, arrivalAt: arrival, ...(acknowledgeOff ? { acknowledgeOff: true } : {}) }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        setOpen(false);
        onChanged(json.data);
      } else if (json.code === "technician_off" && !acknowledgeOff) {
        // They marked that day as not available. Assign only if the admin says so.
        setBusy(false);
        if (window.confirm(json.message)) return submit(true);
      } else {
        setError(json.message || "Could not assign");
      }
    } catch {
      setError("Could not assign. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={openPanel}>{booking.status === "NEW" ? "Confirm and assign technician" : assigned ? "Reassign or change arrival time" : "Assign technician"}</Button>
    );
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium mb-1">Choose a technician</legend>
        {list === null && !error && <p className="text-sm text-muted-foreground">Loading technicians...</p>}
        {list?.length === 0 && <p className="text-sm text-muted-foreground">No active technicians yet. Add one under Technicians.</p>}
        {list?.map((t) => (
          <label
            key={t.id}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${selected === t.id ? "border-blue-700 bg-blue-50" : ""}`}
          >
            <input type="radio" name="technician" className="mt-1 h-4 w-4" checked={selected === t.id} onChange={() => setSelected(t.id)} />
            <span className="grid gap-1">
              <span className="font-medium">
                {t.name} {t.isCurrent && <Badge tone="plain">Current</Badge>}
              </span>
              <span className="flex flex-wrap gap-1.5">
                <Badge tone={t.worksInDistrict ? "good" : "warn"}>{t.worksInDistrict ? `Works in ${booking.district}` : `Not set for ${booking.district}`}</Badge>
                {!t.sameStore && <Badge tone="warn">{t.storeName}</Badge>}
                {t.isOffThatDay && <Badge tone="warn">Not available that day</Badge>}
                <Badge tone={t.handlesAppliance ? "good" : "warn"}>
                  {t.handlesAppliance ? `Handles ${CATEGORY_LABELS[booking.applianceCategory]}` : `Not listed for ${CATEGORY_LABELS[booking.applianceCategory]}`}
                </Badge>
                <Badge tone="plain">{t.activeJobs} open {t.activeJobs === 1 ? "job" : "jobs"}</Badge>
                {t.jobsThatDay > 0 && <Badge tone="plain">{t.jobsThatDay} that day</Badge>}
                <Badge tone="plain">{t.rank.charAt(0) + t.rank.slice(1).toLowerCase()}</Badge>
                {t.ratingCount > 0 && <Badge tone="plain">{t.averageRating.toFixed(1)} rating</Badge>}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-1.5">
        <label htmlFor="arrival" className="text-sm font-medium">
          Arrival time (India time)
        </label>
        <Input id="arrival" type="datetime-local" value={arrival} onChange={(e) => setArrival(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          The customer asked for {booking.date} at {booking.time}. This is the time you are confirming.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
          Back
        </Button>
        <Button onClick={() => submit()} disabled={busy}>
          {busy ? "Saving..." : booking.status === "NEW" ? "Confirm and assign" : "Save"}
        </Button>
      </div>
      {booking.status !== "NEW" && booking.status !== "CONFIRMED" && (
        <p className="text-xs text-amber-700">This job has already started. Saving sends it back to Confirmed for the technician you choose.</p>
      )}
    </div>
  );
}
