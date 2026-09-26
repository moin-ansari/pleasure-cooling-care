"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import TeamAvailability from "@/components/custom/admin/TeamAvailability";
import { Chips, EmptyState, ListSkeleton, PageTitle, RowCard } from "@/components/custom/admin/ui";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { TechnicianListItem } from "@/lib/domain/technicians";

const RANK_STYLE: Record<TechnicianListItem["rank"], string> = {
  BRONZE: "bg-amber-100 text-amber-900",
  SILVER: "bg-slate-200 text-slate-800",
  GOLD: "bg-yellow-100 text-yellow-900",
  DIAMOND: "bg-cyan-100 text-cyan-900",
};
const RANK_LABEL: Record<TechnicianListItem["rank"], string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", DIAMOND: "Diamond" };

function StatusPill({ t }: { t: TechnicianListItem }) {
  const [label, cls] = t.isLocked ? ["Locked", "bg-red-100 text-red-800"] : t.isActive ? ["Active", "bg-emerald-100 text-emerald-800"] : ["Inactive", "bg-slate-200 text-slate-700"];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export default function TechniciansPage() {
  const router = useRouter();
  const { me } = useAdmin();
  const [view, setView] = useState<"team" | "free">("team");
  const [technicians, setTechnicians] = useState<TechnicianListItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/technicians")
      .then((r) => r.json())
      .then((json) => (json.status === "success" ? setTechnicians(json.data) : toast.error(json.message || "Could not load technicians")))
      .catch(() => toast.error("Could not load technicians"));
  }, []);

  return (
    <div>
      <PageTitle
        title="Team"
        sub={technicians ? `${technicians.filter((t) => t.isActive).length} active technicians` : undefined}
        action={
          <Button asChild size="sm">
            <Link href="/admin/technicians/new">
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add
            </Link>
          </Button>
        }
      />

      <div className="mb-3">
        <Chips<"team" | "free"> label="View" value={view} onChange={setView} options={[{ key: "team", label: "Team" }, { key: "free", label: "Who is free" }]} />
      </div>

      {view === "free" ? (
        <TeamAvailability showStore={!!me?.isOwner} />
      ) : technicians === null ? (
        <ListSkeleton />
      ) : technicians.length === 0 ? (
        <EmptyState title="No technicians yet" text="Add the first technician to start assigning jobs." />
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2 lg:hidden">
            {technicians.map((t) => (
              <RowCard key={t.id} href={`/admin/technicians/${t.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.phone}</p>
                  </div>
                  <StatusPill t={t} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className={`rounded px-1.5 py-0.5 font-medium ${RANK_STYLE[t.rank]}`}>{RANK_LABEL[t.rank]}</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                    {t.ratingCount > 0 ? `${t.averageRating.toFixed(1)} (${t.ratingCount})` : "No ratings"}
                  </span>
                  <span>{t.jobsCompletedCount} done</span>
                  <span className={t.activeJobs > 0 ? "font-medium text-amber-700" : ""}>{t.activeJobs > 0 ? `${t.activeJobs} open` : "Free"}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {me?.isOwner && <strong className="font-medium text-slate-700">{t.storeName} · </strong>}
                  {t.specializations.map((c) => CATEGORY_LABELS[c]).join(", ") || "No appliances set"} · {t.districts.join(", ") || "No district"}
                </p>
              </RowCard>
            ))}
          </div>

          <div className="hidden rounded-xl border bg-white shadow-sm lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[22%] p-2">Technician</TableHead>
                  <TableHead className="w-[10%] p-2">Rank</TableHead>
                  <TableHead className="w-[10%] p-2 text-right">Open jobs</TableHead>
                  <TableHead className="w-[10%] p-2 text-right">Completed</TableHead>
                  <TableHead className="w-[10%] p-2 text-right">Rating</TableHead>
                  <TableHead className="w-[26%] p-2">Districts</TableHead>
                  <TableHead className="w-[12%] p-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicians.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/admin/technicians/${t.id}`)}>
                    <TableCell className="p-2">
                      <div className="truncate font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.phone}</div>
                    </TableCell>
                    <TableCell className="p-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${RANK_STYLE[t.rank]}`}>{RANK_LABEL[t.rank]}</span>
                    </TableCell>
                    <TableCell className="p-2 text-right">{t.activeJobs}</TableCell>
                    <TableCell className="p-2 text-right">{t.jobsCompletedCount}</TableCell>
                    <TableCell className="p-2 text-right">{t.ratingCount > 0 ? t.averageRating.toFixed(1) : "-"}</TableCell>
                    <TableCell className="truncate p-2">{t.districts.join(", ") || "-"}</TableCell>
                    <TableCell className="p-2">
                      <StatusPill t={t} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
