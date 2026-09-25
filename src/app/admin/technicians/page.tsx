"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TechnicianListItem } from "@/lib/domain/technicians";

const RANK_STYLE: Record<TechnicianListItem["rank"], string> = {
  BRONZE: "bg-amber-700",
  SILVER: "bg-slate-500",
  GOLD: "bg-yellow-500",
  DIAMOND: "bg-cyan-600",
};

export default function TechniciansPage() {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<TechnicianListItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/technicians")
      .then((r) => r.json())
      .then((json) => (json.status === "success" ? setTechnicians(json.data) : toast.error(json.message || "Could not load technicians")))
      .catch(() => toast.error("Could not load technicians"));
  }, []);

  return (
    <div className="p-3 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Technicians</h1>
        <Button asChild>
          <Link href="/admin/technicians/new">Add technician</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          {technicians === null ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : technicians.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">No technicians yet. Add the first one.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-accent">
                  <TableHead className="p-2">Technician</TableHead>
                  <TableHead className="p-2">Rank</TableHead>
                  <TableHead className="p-2 text-right">Active jobs</TableHead>
                  <TableHead className="p-2 text-right">Completed</TableHead>
                  <TableHead className="p-2 text-right">Rating</TableHead>
                  <TableHead className="p-2">Districts</TableHead>
                  <TableHead className="p-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicians.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/admin/technicians/${t.id}`)}>
                    <TableCell className="p-2">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.phone}</div>
                    </TableCell>
                    <TableCell className="p-2">
                      <Badge className={RANK_STYLE[t.rank]}>{t.rank}</Badge>
                    </TableCell>
                    <TableCell className="p-2 text-right">{t.activeJobs}</TableCell>
                    <TableCell className="p-2 text-right">{t.jobsCompletedCount}</TableCell>
                    <TableCell className="p-2 text-right">{t.ratingCount > 0 ? t.averageRating.toFixed(1) : "-"}</TableCell>
                    <TableCell className="p-2">{t.districts.join(", ") || "-"}</TableCell>
                    <TableCell className="p-2">
                      {t.isLocked ? (
                        <Badge className="bg-red-600">Locked</Badge>
                      ) : (
                        <Badge className={t.isActive ? "bg-green-600" : "bg-gray-400"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
