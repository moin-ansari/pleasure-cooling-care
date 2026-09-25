"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import type { ServiceItem } from "@/types/service";

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [filter, setFilter] = useState<ApplianceCategoryValue | "ALL">("ALL");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/services?all=true");
        const json = await res.json();
        if (json.status === "success") setServices(json.data);
        else toast.error(json.message || "Could not load services");
      } catch {
        toast.error("Could not load services");
      }
    };
    load();
  }, []);

  const visible = (services ?? []).filter((s) => filter === "ALL" || s.applianceCategory === filter);

  return (
    <div className="p-3 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Services</h1>
        <Button asChild>
          <Link href="/admin/services/new">Add service</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["ALL", ...APPLIANCE_CATEGORIES] as const).map((c) => (
          <Button key={c} size="sm" variant={filter === c ? "default" : "outline"} onClick={() => setFilter(c)}>
            {c === "ALL" ? "All" : CATEGORY_LABELS[c]}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent>
          {services === null ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : visible.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">No services yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-accent">
                  <TableHead className="p-2">Service</TableHead>
                  <TableHead className="p-2">Appliance</TableHead>
                  <TableHead className="p-2 text-right">Price</TableHead>
                  <TableHead className="p-2 text-right">Guarantee</TableHead>
                  <TableHead className="p-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/admin/services/${s.id}`)}>
                    <TableCell className="p-2">{s.serviceType}</TableCell>
                    <TableCell className="p-2">
                      {CATEGORY_LABELS[s.applianceCategory]}, {s.applianceSubType}
                    </TableCell>
                    <TableCell className="p-2 text-right">₹{s.price}</TableCell>
                    <TableCell className="p-2 text-right">{s.warrantyDurationDays ? `${s.warrantyDurationDays} days` : "None"}</TableCell>
                    <TableCell className="p-2">
                      <Badge className={s.isActive ? "bg-green-600" : "bg-gray-400"}>{s.isActive ? "Active" : "Hidden"}</Badge>
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
