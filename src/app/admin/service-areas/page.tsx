"use client";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ListSkeleton, PageTitle, Panel } from "@/components/custom/admin/ui";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

export default function ServiceAreasPage() {
  const [areas, setAreas] = useState<ServiceAreaItem[] | null>(null);
  const [state, setState] = useState("Uttar Pradesh");
  const [district, setDistrict] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/service-areas?all=true");
      const json = await res.json();
      if (json.status === "success") setAreas(json.data);
      else toast.error(json.message || "Could not load districts");
    } catch {
      toast.error("Could not load districts");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (url: string, method: string, body?: object) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        await load();
        return true;
      }
      toast.error(json.message || "Something went wrong");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
    return false;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send("/api/service-areas", "POST", { state, district, isActive: true })) setDistrict("");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Areas we serve" sub="Customers can book from any town or village inside an open district. Each open district also gets its own page on the website." />

      <Panel title="Add a district" className="mb-3">
        <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1">
            <label className="text-xs font-medium" htmlFor="area-state">
              State
            </label>
            <Input id="area-state" className="h-11" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs font-medium" htmlFor="area-district">
              District
            </label>
            <Input id="area-district" className="h-11" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Budaun" />
          </div>
          <Button type="submit" className="h-11" disabled={busy || !district.trim()}>
            Add district
          </Button>
        </form>
      </Panel>

      {areas === null ? (
        <ListSkeleton rows={2} />
      ) : areas.length === 0 ? (
        <EmptyState title="No districts yet" text="Add a district to start taking bookings." />
      ) : (
        <ul className="grid gap-2">
          {areas.map((a) => (
            <li key={a.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{a.district}</p>
                  <p className="text-xs text-slate-500">{a.state}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                  {a.isActive ? "Open for bookings" : "Closed"}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => send(`/api/service-areas/${a.id}`, "PUT", { state: a.state, district: a.district, isActive: !a.isActive })}>
                  {a.isActive ? "Close" : "Open"}
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={() => window.confirm(`Delete ${a.district}?`) && send(`/api/service-areas/${a.id}`, "DELETE")}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
