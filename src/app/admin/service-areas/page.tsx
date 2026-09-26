"use client";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { EmptyState, ListSkeleton, PageTitle, Panel } from "@/components/custom/admin/ui";
import type { AdminAreaItem } from "@/lib/domain/serviceAreas";
import type { StoreItem } from "@/lib/domain/stores";

async function call(url: string, method: string, body?: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

export default function ServiceAreasPage() {
  const { me } = useAdmin();
  const isOwner = me?.isOwner ?? false;
  const [areas, setAreas] = useState<AdminAreaItem[] | null>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [state, setState] = useState("Uttar Pradesh");
  const [district, setDistrict] = useState("");
  const [storeId, setStoreId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([fetch("/api/service-areas?all=true").then((r) => r.json()), fetch("/api/admin/stores").then((r) => r.json())]);
      if (a.status === "success") setAreas(a.data);
      else toast.error(a.message || "Could not load cities");
      if (s.status === "success") {
        setStores(s.data.filter((x: StoreItem) => x.isActive));
        setStoreId((cur) => cur || s.data.find((x: StoreItem) => x.isMain)?.id || "");
      }
    } catch {
      toast.error("Could not load cities");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (url: string, method: string, body?: object) => {
    setBusy(true);
    try {
      const json = await call(url, method, body);
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
    if (await run("/api/service-areas", "POST", { state, district, isActive: true, storeId: storeId || undefined })) setDistrict("");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Cities we serve"
        sub="Customers can book from any town or village inside an open city. Each open city also gets its own page on the website, and belongs to one store."
      />

      {isOwner && (
        <Panel title="Add a city" className="mb-3">
          <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs font-medium" htmlFor="area-state">
                State
              </label>
              <Input id="area-state" className="h-11" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium" htmlFor="area-district">
                City or district
              </label>
              <Input id="area-district" className="h-11" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Budaun" />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <label className="text-xs font-medium" htmlFor="area-store">
                Store that serves it
              </label>
              <select id="area-store" value={storeId} onChange={(e) => setStoreId(e.target.value)} className="h-11 rounded-md border bg-background px-3 text-sm">
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isMain ? " (yours)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="h-11" disabled={busy || !district.trim()}>
                Add city
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {areas === null ? (
        <ListSkeleton rows={2} />
      ) : areas.length === 0 ? (
        <EmptyState title="No cities yet" text="Add a city to start taking bookings." />
      ) : (
        <ul className="grid gap-2">
          {areas.map((a) => (
            <li key={a.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{a.district}</p>
                  <p className="text-xs text-slate-500">{a.state}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{a.isActive ? "Open for bookings" : "Closed"}</span>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="grid gap-1">
                  <label className="text-xs text-slate-600" htmlFor={`store-${a.id}`}>
                    Served by
                  </label>
                  {isOwner ? (
                    <select
                      id={`store-${a.id}`}
                      value={a.storeId}
                      disabled={busy}
                      onChange={(e) => {
                        if (window.confirm(`Move ${a.district} to this store? New bookings will belong to it. Bookings already made stay where they are.`)) run(`/api/admin/cities/${a.id}/store`, "PUT", { storeId: e.target.value });
                        else e.target.value = a.storeId;
                      }}
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-medium">{a.storeName}</p>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(`/api/service-areas/${a.id}`, "PUT", { state: a.state, district: a.district, isActive: !a.isActive })}>
                      {a.isActive ? "Close" : "Open"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={() => window.confirm(`Delete ${a.district}?`) && run(`/api/service-areas/${a.id}`, "DELETE")}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
