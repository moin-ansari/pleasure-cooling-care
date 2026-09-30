"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Ban, Phone } from "lucide-react";
import { MdWhatsapp } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import { EmptyState, ListSkeleton, PageTitle, Panel, RowCard, StatTile } from "@/components/custom/admin/ui";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { rupees } from "@/lib/money";
import type { CustomerDetail } from "@/lib/domain/customers";

export default function CustomerPage({ params }: { params: { mobile: string } }) {
  const { me } = useAdmin();
  const isOwner = me?.isOwner ?? false;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [reason, setReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/customers/${params.mobile}`);
      if (res.status === 404) return setMissing(true);
      const json = await res.json();
      if (json.status === "success") setCustomer(json.data);
      else toast.error(json.message || "Could not load the customer");
    } catch {
      toast.error("Could not load the customer");
    }
  }, [params.mobile]);

  useEffect(() => {
    load();
  }, [load]);

  const block = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${params.mobile}/block`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        setBlocking(false);
        setReason("");
        await load();
      } else toast.error(json.message || "Could not block");
    } catch {
      toast.error("Could not block");
    } finally {
      setBusy(false);
    }
  };

  const unblock = async () => {
    if (!window.confirm("Let this number book again?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${params.mobile}/block`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        await load();
      } else toast.error(json.message || "Could not unblock");
    } catch {
      toast.error("Could not unblock");
    } finally {
      setBusy(false);
    }
  };

  if (missing) return <EmptyState title="Customer not found" text="There are no bookings from this number in your stores." />;
  if (!customer) return <ListSkeleton rows={3} />;
  const t = customer.totals;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={customer.names[0]}
        sub={
          <>
            <Link href="/admin/customers" className="text-blue-700 underline">
              Customers
            </Link>{" "}
            · {customer.mobile}
            {customer.names.length > 1 && ` · also booked as ${customer.names.slice(1).join(", ")}`}
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`tel:+91${customer.mobile}`}>
            <Phone className="mr-1.5 h-4 w-4" aria-hidden="true" /> Call
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`https://wa.me/91${customer.mobile}`} target="_blank" rel="noopener noreferrer">
            <MdWhatsapp className="mr-1.5 h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
        </Button>
        <Button asChild size="sm">
          <Link href="/admin/bookings/new">New booking</Link>
        </Button>
      </div>

      {customer.isBlocked && (
        <div role="status" className="mb-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <Ban className="h-4 w-4" aria-hidden="true" /> This number is blocked and cannot book
          </p>
          {customer.blockedReason && <p className="mt-1">{customer.blockedReason}</p>}
          {isOwner && (
            <Button size="sm" variant="outline" className="mt-2" onClick={unblock} disabled={busy}>
              Unblock
            </Button>
          )}
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile label="Bookings" value={t.bookings} note={`${t.completed} done · ${t.cancelled} cancelled`} tone="blue" />
        <StatTile label="Paid" value={rupees(t.spent)} note="Cash collected" tone="green" />
        <StatTile label="Rating given" value={customer.averageRating ?? "-"} note={customer.averageRating ? "Average of their reviews" : "No reviews yet"} tone="amber" />
        <StatTile label="Guarantee claims" value={t.claims} note={`Customer since ${new Date(customer.firstBookingAt).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`} />
      </div>

      <Panel title="Bookings" className="mb-3">
        <ul className="grid gap-2">
          {customer.bookings.map((b) => (
            <li key={b.id}>
              <RowCard href={`/admin/bookings/${b.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-blue-800">
                      {friendlyDay(b.date)}, {b.time}
                    </p>
                    <p className="truncate text-sm font-medium text-slate-900">
                      {b.serviceType} <span className="font-normal text-slate-500">· {CATEGORY_LABELS[b.applianceCategory]}</span>
                    </p>
                  </div>
                  <AdminStatusBadge status={b.status} />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {b.bookingRef} · {b.town}, {b.district} · {b.technicianName ?? "No technician"} · {b.isWarrantyRedo ? "Free re-service" : rupees(b.amountCollected ?? b.price)}
                  {b.rating ? ` · ${b.rating}★` : ""}
                </p>
              </RowCard>
            </li>
          ))}
        </ul>
      </Panel>

      {isOwner && !customer.isBlocked && (
        <Panel title="Block this number">
          {blocking ? (
            <div className="grid gap-2">
              <label htmlFor="block-reason" className="text-xs font-medium text-slate-700">
                Why? (kept in the activity log)
              </label>
              <Input id="block-reason" className="h-11" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated fake bookings" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBlocking(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={block} disabled={busy || reason.trim().length < 3}>
                  {busy ? "Blocking..." : "Block this number"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">A blocked number cannot book on the website or through an assistant. Use this for repeated fake bookings or abuse.</p>
              <Button variant="outline" size="sm" className="mt-2 text-red-700" onClick={() => setBlocking(true)}>
                <Ban className="mr-1.5 h-4 w-4" aria-hidden="true" /> Block
              </Button>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
