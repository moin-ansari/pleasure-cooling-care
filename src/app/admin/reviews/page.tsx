"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stars } from "@/components/custom/seo/ReviewsSection";
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
      <div>
        <h1 className="text-xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground">Reviews are shown on the website straight away. Hide one if it is abusive or not genuine. Hidden reviews do not count towards a technician&apos;s rating.</p>
      </div>
      <div role="group" aria-label="Filter" className="flex gap-2">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {!reviews ? (
        <p className="py-10 text-center text-muted-foreground">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No reviews here.</p>
      ) : (
        reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="grid gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars value={r.rating} />
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </div>
              {r.comment ? <p className="text-sm">{r.comment}</p> : <p className="text-sm text-muted-foreground">No comment</p>}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.customerName}</span> · {r.serviceType} ({CATEGORY_LABELS[r.applianceCategory]}) · Technician {r.technicianName} ·{" "}
                <Link href={`/admin/bookings/${r.bookingId}`} className="underline">
                  {r.bookingRef}
                </Link>
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-medium ${r.isPublic ? "text-green-700" : "text-amber-700"}`}>{r.isPublic ? "Shown on the website" : "Hidden"}</span>
                <Button size="sm" variant="outline" onClick={() => toggle(r)} disabled={busyId === r.id}>
                  {r.isPublic ? "Hide" : "Show"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
