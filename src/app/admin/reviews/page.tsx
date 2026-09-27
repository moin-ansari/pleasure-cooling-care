"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/custom/seo/ReviewsSection";
import { Chips, EmptyState, ListSkeleton, PageTitle } from "@/components/custom/admin/ui";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { AdminReview } from "@/lib/domain/reviews";

type Filter = "all" | "low" | "hidden";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "1-2 stars" },
  { key: "hidden", label: "Hidden" },
];

export default function ReviewsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reviews?filter=${filter}`);
      const json = await res.json();
      if (json.status === "success") setReviews(json.data);
      else toast.error(json.message || "Could not load reviews");
    } catch {
      toast.error("Could not load reviews");
    }
  }, [filter]);

  useEffect(() => {
    setReviews(null);
    load();
  }, [load]);

  const toggle = async (r: AdminReview) => {
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/reviews/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !r.isPublic }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        await load();
      } else toast.error(json.message || "Could not update");
    } catch {
      toast.error("Could not update");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-3">
      <PageTitle title="Reviews" sub="Shown on the website straight away. Hide one if it is abusive or not genuine. Hidden reviews do not count towards a technician's rating." />

      <Chips label="Filter" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ key: f.key, label: f.label }))} />

      {!reviews ? (
        <ListSkeleton rows={3} />
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews here" text={filter === "all" ? "Reviews appear here once a customer rates a completed job." : "Try another filter."} />
      ) : (
        <ul className="grid gap-2.5">
          {reviews.map((r) => (
            <li key={r.id} className={`grid gap-2 rounded-xl border border-l-4 bg-white p-3 shadow-sm ${r.isPublic ? "border-l-emerald-500" : "border-l-slate-300"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars value={r.rating} />
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </div>
              {r.comment ? <p className="text-sm">{r.comment}</p> : <p className="text-sm text-muted-foreground">No comment</p>}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.customerName}</span> · {r.serviceType} ({CATEGORY_LABELS[r.applianceCategory]}) · Technician {r.technicianName} ·{" "}
                <Link href={`/admin/bookings/${r.bookingId}`} className="text-blue-700 hover:underline">
                  {r.bookingRef}
                </Link>
              </p>
              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${r.isPublic ? "text-emerald-700" : "text-amber-700"}`}>
                  {r.isPublic ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                  {r.isPublic ? "Shown on the website" : "Hidden"}
                </span>
                <Button size="sm" variant="outline" onClick={() => toggle(r)} disabled={busyId === r.id}>
                  {busyId === r.id ? "Saving..." : r.isPublic ? "Hide" : "Show"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
