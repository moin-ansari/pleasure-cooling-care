"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { Ban, CalendarOff, Pencil, Phone, ShieldCheck, Star } from "lucide-react";
import { MdWhatsapp } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import { EmptyState, ListSkeleton, PageTitle, Panel, RowCard, StatTile } from "@/components/custom/admin/ui";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { rupees } from "@/lib/money";
import type { ProfileJob, TechnicianProfile } from "@/lib/domain/technicianProfile";

const RANK_LABEL = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", DIAMOND: "Diamond" } as const;
const RANK_STYLE = { BRONZE: "bg-amber-100 text-amber-900", SILVER: "bg-slate-200 text-slate-800", GOLD: "bg-yellow-100 text-yellow-900", DIAMOND: "bg-cyan-100 text-cyan-900" } as const;

function JobRow({ j }: { j: ProfileJob }) {
  return (
    <RowCard href={`/admin/bookings/${j.id}`} tone={j.reassignRequested ? "alert" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-800">
            {friendlyDay(j.date)}, {j.time}
          </p>
          <p className="text-sm font-medium leading-tight text-slate-900">
            {j.serviceType} <span className="font-normal text-slate-500">· {CATEGORY_LABELS[j.applianceCategory]}</span>
          </p>
        </div>
        <AdminStatusBadge status={j.status} />
      </div>
      <p className="mt-1 text-xs text-slate-600">
        {j.customerName} · {j.town} · {j.bookingRef} · {rupees(j.amountCollected ?? j.price)}
      </p>
      {j.reassignRequested && <p className="mt-1 text-xs font-semibold text-red-700">Cannot attend. Needs someone else.</p>}
    </RowCard>
  );
}

export default function TechnicianProfilePage({ params }: { params: { id: string } }) {
  const { me } = useAdmin();
  const [data, setData] = useState<TechnicianProfile | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/technicians/${params.id}/profile`)
      .then(async (res) => {
        if (res.status === 404) return setMissing(true);
        const json = await res.json();
        if (json.status === "success") setData(json.data);
        else toast.error(json.message || "Could not load the technician");
      })
      .catch(() => toast.error("Could not load the technician"));
  }, [params.id]);

  if (missing) return <EmptyState title="Technician not found" text="They may belong to another store." />;
  if (!data) return <ListSkeleton rows={3} />;

  const t = data.technician;
  const s = data.stats;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={t.name}
        sub={
          <Link href="/admin/technicians" className="text-blue-700 underline">
            Team
          </Link>
        }
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/technicians/${t.id}/edit`}>
              <Pencil className="mr-1 h-4 w-4" aria-hidden="true" /> Edit
            </Link>
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-slate-100">
          {t.photo ? <Image src={t.photo} alt="" fill sizes="64px" className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center text-xl font-semibold text-slate-400">{t.name[0]}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${RANK_STYLE[t.rank]}`}>{RANK_LABEL[t.rank]}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              {t.ratingCount > 0 ? `${t.averageRating.toFixed(1)} (${t.ratingCount})` : "No ratings yet"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.isLocked ? "bg-red-100 text-red-800" : t.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
              {t.isLocked ? "Locked" : t.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            {me?.isOwner && <strong className="font-medium text-slate-800">{t.storeName} · </strong>}
            {t.specializations.map((c) => CATEGORY_LABELS[c]).join(", ") || "No appliances set"}
          </p>
          <p className="text-xs text-slate-500">{t.phone} · {t.workEmail}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`tel:+91${t.phone}`}>
            <Phone className="mr-1.5 h-4 w-4" aria-hidden="true" /> Call
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`https://wa.me/91${t.phone}`} target="_blank" rel="noopener noreferrer">
            <MdWhatsapp className="mr-1.5 h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/finance/technicians/${t.id}`}>Payments</Link>
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile label="Jobs done" value={s.jobsDone} note={`${s.openJobs} open now`} Icon={ShieldCheck} tone="blue" />
        <StatTile label="This month" value={s.monthJobs} note={`${rupees(s.monthCollected)} collected`} tone="green" />
        <StatTile label="Commission" value={rupees(s.monthCommission)} note="This month" />
        <StatTile label={s.balance > 0 ? "Owes the store" : "Balance"} value={rupees(Math.abs(s.balance))} note={s.balance > 0 ? "Still to pay in" : s.balance < 0 ? "Store owes them" : "Settled"} tone={s.balance > 0 ? "amber" : "slate"} href={`/admin/finance/technicians/${t.id}`} />
      </div>

      {data.offDays.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <CalendarOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong>Not available:</strong> {data.offDays.map((d) => friendlyDay(d)).join(", ")}
          </p>
        </div>
      )}

      <Panel title={`Coming up (${data.upcoming.length})`} className="mb-3">
        {data.upcoming.length === 0 ? (
          <EmptyState title="No open jobs" />
        ) : (
          <div className="grid gap-2">
            {data.upcoming.map((j) => (
              <JobRow key={j.id} j={j} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Recent jobs" className="mb-3">
        {data.recent.length === 0 ? (
          <EmptyState title="No finished jobs yet" />
        ) : (
          <div className="grid gap-2">
            {data.recent.map((j) => (
              <JobRow key={j.id} j={j} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Reviews" className="mb-3">
        {data.reviews.length === 0 ? (
          <EmptyState title="No reviews yet" />
        ) : (
          <ul className="grid gap-2">
            {data.reviews.map((r) => (
              <li key={r.id} className={`rounded-lg border p-2.5 ${r.isPublic ? "" : "bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-amber-600" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                  <span className="text-slate-500">{r.date}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  {r.customerName} · {r.serviceType}
                  {!r.isPublic && (
                    <span className="inline-flex items-center gap-0.5 text-red-700">
                      <Ban className="h-3 w-3" aria-hidden="true" /> hidden
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-slate-500">
        ID document: {data.hasIdProof ? "on file" : "not added"}. Districts: {t.serviceAreaIds.length ? "set" : "none"}. Joined {new Date(t.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}.
      </p>
    </div>
  );
}
