"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Clock, PhoneCall, ShieldCheck, ShieldX, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chips, EmptyState, ListSkeleton, PageTitle } from "@/components/custom/admin/ui";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { AssignableTechnician } from "@/lib/domain/adminBookings";
import type { ClaimItem, ClaimStatusValue } from "@/lib/domain/warranty";

const FILTERS: { key: ClaimStatusValue; label: string }[] = [
  { key: "PENDING", label: "Waiting" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Declined" },
];

const REJECT_REASONS = ["Not related to our work", "Outside the guarantee terms", "Already fixed", "Could not reach the customer"];

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

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

  const STATUS_STYLE: Record<ClaimStatusValue, { edge: string; badge: string; label: string; Icon: React.ElementType }> = {
    PENDING: { edge: "border-l-amber-400", badge: "bg-amber-100 text-amber-800", label: "Waiting", Icon: Clock },
    APPROVED: { edge: "border-l-emerald-500", badge: "bg-emerald-100 text-emerald-800", label: "Approved", Icon: ShieldCheck },
    REJECTED: { edge: "border-l-slate-400", badge: "bg-slate-100 text-slate-700", label: "Declined", Icon: ShieldX },
  };
  const st = STATUS_STYLE[claim.status];

  return (
    <li className={`grid gap-2.5 rounded-xl border border-l-4 bg-white p-3 shadow-sm ${st.edge}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {claim.serviceType} <span className="font-normal text-slate-500">({CATEGORY_LABELS[claim.applianceCategory]}, {claim.town})</span>
          </p>
          <Link href={`/admin/bookings/${claim.originalBookingId}`} className="font-mono text-xs text-blue-700 hover:underline">
            {claim.bookingRef}
          </Link>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.badge}`}>
          <st.Icon className="h-3 w-3" aria-hidden="true" /> {st.label}
        </span>
      </div>

      <p className="rounded-md bg-slate-50 p-2.5 text-sm">&ldquo;{claim.issueDescription}&rdquo;</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Customer</dt>
        <dd className="flex items-center gap-1.5">
          {claim.customerName}
          <a className="inline-flex items-center gap-0.5 text-blue-700" href={`tel:+91${claim.mobile}`}>
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" /> {claim.mobile}
          </a>
        </dd>
        <dt className="text-muted-foreground">Technician</dt>
        <dd className="flex items-center gap-1">
          <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          {claim.technician ? `${claim.technician.name}${claim.technician.isActive ? "" : " (not active)"}` : "-"}
        </dd>
        <dt className="text-muted-foreground">Completed</dt>
        <dd>{claim.completedAt ? when(claim.completedAt) : "-"}</dd>
        <dt className="text-muted-foreground">Guarantee until</dt>
        <dd>{claim.warrantyExpiresAt ? when(claim.warrantyExpiresAt) : "-"}</dd>
        <dt className="text-muted-foreground">Claimed</dt>
        <dd>{when(claim.createdAt)}</dd>
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
              <Link href={`/admin/bookings/${claim.freeBooking.id}`} className="font-mono text-blue-700 hover:underline">
                {claim.freeBooking.bookingRef}
              </Link>
            </dd>
          </>
        )}
      </dl>

      {claim.status === "PENDING" && mode === "none" && (
        <div className="flex gap-2 border-t pt-2.5">
          <Button size="sm" className="flex-1" onClick={() => setMode("approve")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setMode("reject")}>
            Decline
          </Button>
        </div>
      )}

      {mode === "approve" && (
        <div className="grid gap-2 border-t pt-2.5">
          <label htmlFor={`arrival-${claim.id}`} className="text-xs font-medium">
            When will the technician visit?
          </label>
          <Input id={`arrival-${claim.id}`} type="datetime-local" className="h-10" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} />
          {!originalUsable && (
            <div className="grid gap-1">
              <label htmlFor={`tech-${claim.id}`} className="text-xs font-medium">
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
            <p role="alert" className="text-xs text-red-600">
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
        <div className="grid gap-2 border-t pt-2.5">
          <label htmlFor={`reason-${claim.id}`} className="text-xs font-medium">
            Reason (sent to the customer)
          </label>
          <Input id={`reason-${claim.id}`} className="h-10" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          <Chips
            label="Quick reasons"
            value={reason}
            onChange={setReason}
            options={REJECT_REASONS.map((r) => ({ key: r, label: r }))}
          />
          {error && (
            <p role="alert" className="text-xs text-red-600">
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
    </li>
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
    <div className="mx-auto grid w-full max-w-3xl gap-3">
      <PageTitle title="Guarantee claims" sub="A free re-service, requested from the customer's tracking page" />

      <Chips label="Status" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ key: f.key, label: f.label }))} />

      {!claims ? (
        <ListSkeleton rows={3} />
      ) : claims.length === 0 ? (
        <EmptyState title="No claims here" text={filter === "PENDING" ? "New guarantee claims will show up here first." : "Try another status."} />
      ) : (
        <ul className="grid gap-2.5">
          {claims.map((c) => (
            <ClaimCard key={c.id} claim={c} onDone={load} />
          ))}
        </ul>
      )}
    </div>
  );
}
