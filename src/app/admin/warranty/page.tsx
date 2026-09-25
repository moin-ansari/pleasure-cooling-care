"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { AssignableTechnician } from "@/lib/domain/adminBookings";
import type { ClaimItem, ClaimStatusValue } from "@/lib/domain/warranty";

const FILTERS: { key: ClaimStatusValue; label: string }[] = [
  { key: "PENDING", label: "Waiting" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Declined" },
];

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function ClaimCard({ claim, onDone }: { claim: ClaimItem; onDone: () => void }) {
  const [mode, setMode] = useState<"none" | "approve" | "reject">("none");
  const [arrivalAt, setArrivalAt] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [technicians, setTechnicians] = useState<AssignableTechnician[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const originalUsable = !!claim.technician?.isActive;

  useEffect(() => {
    if (mode !== "approve" || originalUsable) return;
    fetch(`/api/admin/bookings/${claim.originalBookingId}/assignable`)
      .then((r) => r.json())
      .then((json) => json.status === "success" && setTechnicians(json.data))
      .catch(() => undefined);
  }, [mode, originalUsable, claim.originalBookingId]);

  const send = async (action: "approve" | "reject") => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/warranty-claims/${claim.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { arrivalAt, ...(technicianId ? { technicianId } : {}) } : { reason }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        onDone();
      } else setError(json.message || "Could not save");
    } catch {
      setError("Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="grid gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/admin/bookings/${claim.originalBookingId}`} className="font-mono text-sm underline">
            {claim.bookingRef}
          </Link>
          <span className="text-xs text-muted-foreground">Claimed {when(claim.createdAt)}</span>
        </div>
        <p className="font-semibold">
          {claim.serviceType}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({CATEGORY_LABELS[claim.applianceCategory]}, {claim.town})
          </span>
        </p>
        <p className="rounded-md bg-muted p-3 text-sm">&ldquo;{claim.issueDescription}&rdquo;</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Customer</dt>
          <dd>
            {claim.customerName} ·{" "}
            <a className="underline" href={`tel:+91${claim.mobile}`}>
              {claim.mobile}
            </a>
          </dd>
          <dt className="text-muted-foreground">Technician</dt>
          <dd>{claim.technician ? `${claim.technician.name}${claim.technician.isActive ? "" : " (not active)"}` : "-"}</dd>
          <dt className="text-muted-foreground">Job completed</dt>
          <dd>{claim.completedAt ? when(claim.completedAt) : "-"}</dd>
          <dt className="text-muted-foreground">Guarantee until</dt>
          <dd>{claim.warrantyExpiresAt ? when(claim.warrantyExpiresAt) : "-"}</dd>
          {claim.rejectReason && (
            <>
              <dt className="text-muted-foreground">Declined because</dt>
              <dd>{claim.rejectReason}</dd>
            </>
          )}
          {claim.freeBooking && (
            <>
              <dt className="text-muted-foreground">Free re-service</dt>
              <dd>
                <Link href={`/admin/bookings/${claim.freeBooking.id}`} className="underline">
                  {claim.freeBooking.bookingRef}
                </Link>
              </dd>
            </>
          )}
        </dl>

        {claim.status === "PENDING" && mode === "none" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => setMode("approve")}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode("reject")}>
              Decline
            </Button>
          </div>
        )}

        {mode === "approve" && (
          <div className="grid gap-2 border-t pt-3">
            <div className="grid gap-1">
              <label htmlFor={`arrival-${claim.id}`} className="text-sm font-medium">
                When will the technician visit?
              </label>
              <Input id={`arrival-${claim.id}`} type="datetime-local" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} />
            </div>
            {!originalUsable && (
              <div className="grid gap-1">
                <label htmlFor={`tech-${claim.id}`} className="text-sm font-medium">
                  The original technician is not available. Choose another.
                </label>
                <select id={`tech-${claim.id}`} value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">Choose a technician</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.activeJobs} open jobs)
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setMode("none")} disabled={busy}>
                Back
              </Button>
              <Button size="sm" onClick={() => send("approve")} disabled={busy || !arrivalAt}>
                {busy ? "Saving..." : "Approve and book free re-service"}
              </Button>
            </div>
          </div>
        )}

        {mode === "reject" && (
          <div className="grid gap-2 border-t pt-3">
            <label htmlFor={`reason-${claim.id}`} className="text-sm font-medium">
              Reason (sent to the customer)
            </label>
            <Input id={`reason-${claim.id}`} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setMode("none")} disabled={busy}>
                Back
              </Button>
              <Button size="sm" onClick={() => send("reject")} disabled={busy || reason.trim().length < 3}>
                {busy ? "Saving..." : "Decline claim"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WarrantyPage() {
  const [filter, setFilter] = useState<ClaimStatusValue>("PENDING");
  const [claims, setClaims] = useState<ClaimItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/warranty-claims?status=${filter}`);
      const json = await res.json();
      if (json.status === "success") setClaims(json.data);
      else toast.error(json.message || "Could not load claims");
    } catch {
      toast.error("Could not load claims");
    }
  }, [filter]);

  useEffect(() => {
    setClaims(null);
    load();
  }, [load]);

  return (
    <div className="p-3 w-full max-w-3xl mx-auto grid gap-4">
      <h1 className="text-xl font-semibold">Guarantee claims</h1>
      <div role="group" aria-label="Status" className="flex gap-2">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>
      {!claims ? (
        <p className="py-10 text-center text-muted-foreground">Loading...</p>
      ) : claims.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No claims here.</p>
      ) : (
        claims.map((c) => <ClaimCard key={c.id} claim={c} onDone={load} />)
      )}
    </div>
  );
}
