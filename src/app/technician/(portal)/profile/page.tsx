"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MdLogout } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { techFetch } from "@/components/custom/technician/techFetch";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { TechnicianSelf } from "@/lib/domain/technicians";

const RANK_LABEL: Record<TechnicianSelf["rank"], string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", DIAMOND: "Diamond" };

export default function ProfilePage() {
  const [me, setMe] = useState<TechnicianSelf | null>(null);

  useEffect(() => {
    techFetch("/api/technician/me")
      .then((json) => json.status === "success" && setMe(json.data))
      .catch(() => undefined);
  }, []);

  const logout = async () => {
    await fetch("/api/technician/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/technician/login";
  };

  if (!me) return <p className="py-10 text-center text-muted-foreground">Loading...</p>;

  return (
    <div className="grid gap-4">
      <section className="flex items-center gap-3 rounded-lg border bg-background p-4 shadow-sm">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-slate-100">
          {me.photo ? <Image src={me.photo} alt="" fill sizes="64px" className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center text-xl font-semibold text-slate-400">{me.name[0]}</span>}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{me.name}</h1>
          <p className="truncate text-sm text-muted-foreground">{me.workEmail}</p>
          <p className="text-sm text-muted-foreground">{me.phone}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center" aria-label="Your numbers">
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="text-lg font-bold">{RANK_LABEL[me.rank]}</p>
          <p className="text-xs text-muted-foreground">Rank</p>
        </div>
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="text-lg font-bold">{me.jobsCompletedCount}</p>
          <p className="text-xs text-muted-foreground">Jobs done</p>
        </div>
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="text-lg font-bold">{me.ratingCount > 0 ? me.averageRating.toFixed(1) : "-"}</p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
      </section>

      {me.nextRank && (
        <section className="rounded-lg border bg-background p-4 text-sm shadow-sm" aria-label="Next rank">
          <p className="font-medium">Next rank: {RANK_LABEL[me.nextRank.rank]}</p>
          <p className="text-muted-foreground">
            {me.nextRank.jobsNeeded > 0 ? `${me.nextRank.jobsNeeded} more completed jobs` : "Enough completed jobs"}
            {me.nextRank.ratingNeeded !== null ? ` and an average rating of ${me.nextRank.ratingNeeded.toFixed(1)} or more` : ""}.
          </p>
        </section>
      )}

      <section className="rounded-lg border bg-background p-4 text-sm shadow-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Experience</dt>
          <dd>{me.experienceYears !== null ? `${me.experienceYears} years` : "-"}</dd>
          <dt className="text-muted-foreground">Appliances</dt>
          <dd>{me.specializations.length ? me.specializations.map((c) => CATEGORY_LABELS[c]).join(", ") : "-"}</dd>
          <dt className="text-muted-foreground">Districts</dt>
          <dd>{me.districts.length ? me.districts.join(", ") : "-"}</dd>
        </dl>
      </section>

      <Button variant="outline" className="h-12 text-base" onClick={logout}>
        <MdLogout className="mr-2 h-5 w-5" aria-hidden="true" /> Log out
      </Button>
    </div>
  );
}
