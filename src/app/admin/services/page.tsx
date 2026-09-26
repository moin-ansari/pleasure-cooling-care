"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Chips, EmptyState, ListSkeleton, PageTitle, RowCard } from "@/components/custom/admin/ui";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import type { ServiceItem } from "@/types/service";

type Filter = ApplianceCategoryValue | "ALL";

function StatusPill({ active }: { active: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{active ? "Active" : "Hidden"}</span>;
}

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    fetch("/api/services?all=true")
      .then((r) => r.json())
      .then((json) => (json.status === "success" ? setServices(json.data) : toast.error(json.message || "Could not load services")))
      .catch(() => toast.error("Could not load services"));
  }, []);

  const visible = (services ?? []).filter((s) => filter === "ALL" || s.applianceCategory === filter);

  return (
    <div>
      <PageTitle
        title="Services"
        sub={services ? `${services.length} services · ${services.filter((s) => s.isActive).length} shown to customers` : undefined}
        action={
          <Button asChild size="sm">
            <Link href="/admin/services/new">
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add
            </Link>
          </Button>
        }
      />

      <div className="mb-3">
        <Chips<Filter>
          label="Appliance"
          value={filter}
          onChange={setFilter}
          options={[{ key: "ALL", label: "All" }, ...APPLIANCE_CATEGORIES.map((c) => ({ key: c as Filter, label: CATEGORY_LABELS[c] }))]}
        />
      </div>

      {services === null ? (
        <ListSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState title="No services here yet" />
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2 lg:hidden">
            {visible.map((s) => (
              <RowCard key={s.id} href={`/admin/services/${s.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{s.serviceType}</p>
                    <p className="truncate text-xs text-slate-500">
                      {CATEGORY_LABELS[s.applianceCategory]}, {s.applianceSubType}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-bold text-blue-800">₹{s.price}</p>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.warrantyDurationDays ? `${s.warrantyDurationDays}-day guarantee` : "No guarantee"}
                  </span>
                  <StatusPill active={s.isActive} />
                </div>
              </RowCard>
            ))}
          </div>

          <div className="hidden rounded-xl border bg-white shadow-sm lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[30%] p-2">Service</TableHead>
                  <TableHead className="w-[30%] p-2">Appliance</TableHead>
                  <TableHead className="w-[12%] p-2 text-right">Price</TableHead>
                  <TableHead className="w-[16%] p-2 text-right">Guarantee</TableHead>
                  <TableHead className="w-[12%] p-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/admin/services/${s.id}`)}>
                    <TableCell className="truncate p-2 font-medium">{s.serviceType}</TableCell>
                    <TableCell className="truncate p-2">
                      {CATEGORY_LABELS[s.applianceCategory]}, {s.applianceSubType}
                    </TableCell>
                    <TableCell className="p-2 text-right">₹{s.price}</TableCell>
                    <TableCell className="p-2 text-right">{s.warrantyDurationDays ? `${s.warrantyDurationDays} days` : "None"}</TableCell>
                    <TableCell className="p-2">
                      <StatusPill active={s.isActive} />
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
