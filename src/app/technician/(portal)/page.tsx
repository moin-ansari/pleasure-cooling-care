"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AvailabilityCard from "@/components/custom/technician/AvailabilityCard";
import JobStatusBadge from "@/components/custom/technician/JobStatusBadge";
import { techFetch } from "@/components/custom/technician/techFetch";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import CategoryTabs from "@/components/custom/CategoryTabs";
import { CategoryBadge } from "@/components/custom/categoryIcons";
import { CATEGORY_LABELS, type ApplianceCategoryValue, type CategoryFilter } from "@/constants/appliances";
import type { JobListItem } from "@/lib/domain/technicianJobs";

type Buckets = { upcoming: JobListItem[]; ongoing: JobListItem[]; completed: JobListItem[] };
type Tab = keyof Buckets;

const TABS: { key: Tab; label: string }[] = [
  { key: "upcoming", label: "New" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Buckets | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");

  const load = useCallback(async () => {
    try {
      const json = await techFetch("/api/technician/jobs");
      if (json.status === "success") {
        setJobs(json.data);
        setTab((current) => current ?? (json.data.ongoing.length ? "ongoing" : "upcoming"));
      } else {
        toast.error(json.message || "Could not load jobs");
      }
    } catch {
      // session errors are handled in techFetch
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryCounts = useMemo(() => {
    const counts = { AC: 0, REFRIGERATOR: 0, WASHING_MACHINE: 0, GEYSER: 0 } as Record<ApplianceCategoryValue, number>;
    if (jobs && tab) for (const job of jobs[tab]) counts[job.applianceCategory] += 1;
    return counts;
  }, [jobs, tab]);

  if (!jobs || !tab) {
    return <p className="py-10 text-center text-muted-foreground">Loading your jobs...</p>;
  }

  const list = jobs[tab].filter((job) => category === "all" || job.applianceCategory === category);

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">My jobs</h1>

      <AvailabilityCard />

      <div role="tablist" aria-label="Job lists" className="mb-3 grid grid-cols-3 rounded-lg bg-background p-1 shadow-sm">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-[44px] rounded-md text-sm font-medium ${tab === key ? "bg-blue-800 text-white" : "text-muted-foreground"}`}
          >
            {label} <span className="opacity-80">({jobs[key].length})</span>
          </button>
        ))}
      </div>

      <CategoryTabs value={category} counts={categoryCounts} onChange={setCategory} />

      {list.length === 0 ? (
        <p className="rounded-lg bg-background p-6 text-center text-muted-foreground">
          {category !== "all"
            ? "No jobs of this kind here."
            : tab === "upcoming"
              ? "No new jobs right now."
              : tab === "ongoing"
                ? "No jobs in progress."
                : "No completed jobs yet."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {list.map((job) => (
            <li key={job.id}>
              <Link href={`/technician/jobs/${job.id}`} className="flex items-start gap-3 rounded-lg border bg-background p-4 shadow-sm active:bg-muted">
                <CategoryBadge category={job.applianceCategory} size="h-9 w-9" iconSize="h-5 w-5" />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <JobStatusBadge status={job.status} />
                    {job.isWarrantyRedo && <span className="text-xs font-medium text-purple-700">Free re-service</span>}
                    {job.reassignRequested && <span className="text-xs font-medium text-red-700">Waiting for the office</span>}
                  </div>
                  <p className="text-lg font-semibold">
                    {friendlyDay(job.date)}, {job.time}
                  </p>
                  <p className="font-medium">{job.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.serviceType} &middot; {CATEGORY_LABELS[job.applianceCategory]} ({job.applianceSubType})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {job.town}, {job.district}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
