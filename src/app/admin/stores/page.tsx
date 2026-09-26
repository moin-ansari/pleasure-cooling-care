"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Building2, ChevronRight, MapPin, Plus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { EmptyState, ListSkeleton, PageTitle } from "@/components/custom/admin/ui";
import { rupees } from "@/lib/money";
import type { StoreItem } from "@/lib/domain/stores";

type Admin = StoreItem["admins"][number];

async function send(url: string, method: string, body: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

const terms = (s: StoreItem) => {
  const flat = s.flatAmount > 0 ? ` + ${rupees(s.flatAmount)}` : "";
  return s.isMain
    ? `Technicians pay ${s.technicianRatePercent}%${flat}. All of it is yours.`
    : `Technicians pay ${s.technicianRatePercent}%${flat}. You get ${s.ownerRatePercent}%${flat}, the store keeps ${(s.technicianRatePercent - s.ownerRatePercent).toFixed(2).replace(/\.?0+$/, "")}%.`;
};

export default function StoresPage() {
  const { me } = useAdmin();
  const isOwner = me?.isOwner ?? false;
  const [stores, setStores] = useState<StoreItem[] | null>(null);
  const [saving, setSaving] = useState(false);

  // store form
  const [storeSheet, setStoreSheet] = useState<{ mode: "create" | "edit"; store?: StoreItem } | null>(null);
  const [f, setF] = useState({ name: "", technicianRatePercent: "20", ownerRatePercent: "10", flatAmount: "0", adminAlertPhone: "", isActive: true });

  // co-admin form
  const [adminSheet, setAdminSheet] = useState<{ mode: "create" | "edit"; store: StoreItem; admin?: Admin } | null>(null);
  const [a, setA] = useState({ name: "", email: "", phone: "", password: "", isActive: true });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stores");
      const json = await res.json();
      if (json.status === "success") setStores(json.data);
      else toast.error(json.message || "Could not load stores");
    } catch {
      toast.error("Could not load stores");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openStore = (mode: "create" | "edit", store?: StoreItem) => {
    setF(
      store
        ? { name: store.name, technicianRatePercent: String(store.technicianRatePercent), ownerRatePercent: String(store.ownerRatePercent), flatAmount: String(store.flatAmount), adminAlertPhone: store.adminAlertPhone ?? "", isActive: store.isActive }
        : { name: "", technicianRatePercent: "20", ownerRatePercent: "10", flatAmount: "0", adminAlertPhone: "", isActive: true }
    );
    setStoreSheet({ mode, store });
  };

  const saveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeSheet) return;
    setSaving(true);
    try {
      const body = {
        name: f.name,
        technicianRatePercent: Number(f.technicianRatePercent),
        ownerRatePercent: storeSheet.store?.isMain ? Number(f.technicianRatePercent) : Number(f.ownerRatePercent),
        flatAmount: Number(f.flatAmount || 0),
        adminAlertPhone: f.adminAlertPhone.trim(),
        ...(storeSheet.mode === "edit" ? { isActive: f.isActive } : {}),
      };
      const json = storeSheet.mode === "create" ? await send("/api/admin/stores", "POST", body) : await send(`/api/admin/stores/${storeSheet.store!.id}`, "PUT", body);
      if (json.status === "success") {
        toast.success(json.message);
        setStoreSheet(null);
        await load();
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const openAdmin = (store: StoreItem, admin?: Admin) => {
    setA(admin ? { name: admin.name, email: admin.email, phone: admin.phone ?? "", password: "", isActive: admin.isActive } : { name: "", email: "", phone: "", password: "", isActive: true });
    setAdminSheet({ mode: admin ? "edit" : "create", store, admin });
  };

  const saveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSheet) return;
    setSaving(true);
    try {
      const json =
        adminSheet.mode === "create"
          ? await send("/api/admin/co-admins", "POST", { name: a.name, email: a.email, phone: a.phone.trim(), password: a.password, storeId: adminSheet.store.id })
          : await send(`/api/admin/co-admins/${adminSheet.admin!.id}`, "PUT", { name: a.name, phone: a.phone.trim(), isActive: a.isActive, storeId: adminSheet.store.id, newPassword: a.password });
      if (json.status === "success") {
        toast.success(json.message);
        setAdminSheet(null);
        await load();
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-6">
      <PageTitle
        title={isOwner ? "Stores" : "My store"}
        sub={isOwner ? "A store is a group of cities run by you or by a co-admin. Money terms and balances are per store." : undefined}
        action={
          isOwner && (
            <Button size="sm" onClick={() => openStore("create")}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add
            </Button>
          )
        }
      />

      {!stores ? (
        <ListSkeleton />
      ) : stores.length === 0 ? (
        <EmptyState title="No stores" />
      ) : (
        <ul className="grid gap-3">
          {stores.map((s) => (
            <li key={s.id} className={`rounded-xl border bg-white p-3 shadow-sm ${s.isActive ? "" : "bg-slate-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    <Building2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
                    {s.name}
                    {s.isMain && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-800">Yours</span>}
                    {!s.isActive && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">Off</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{terms(s)}</p>
                </div>
                {isOwner && (
                  <Button size="sm" variant="outline" onClick={() => openStore("edit", s)}>
                    Edit
                  </Button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Cities">
                {s.cities.length === 0 ? (
                  <span className="text-xs text-slate-500">No cities yet</span>
                ) : (
                  s.cities.map((c) => (
                    <span key={c.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${c.isActive ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {c.district}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" /> {s.technicianCount} {s.technicianCount === 1 ? "technician" : "technicians"}
                </span>
                {s.adminAlertPhone && <span>Alerts to {s.adminAlertPhone}</span>}
              </div>

              {!s.isMain && (
                <Link href={`/admin/stores/${s.id}`} className={`mt-2 flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${s.owesOwner > 0 ? "border-amber-300 bg-amber-50" : "bg-slate-50"}`}>
                  <span>
                    {isOwner ? "Owes you" : "Your store owes the owner"}
                    <strong className={`ml-2 ${s.owesOwner > 0 ? "text-red-700" : ""}`}>{rupees(s.owesOwner)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-700">
                    {isOwner ? "Record payment" : "See details"} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              )}

              {!s.isMain && (
                <div className="mt-2 border-t pt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Co-admins</p>
                    {isOwner && (
                      <button className="inline-flex items-center gap-1 text-xs font-medium text-blue-700" onClick={() => openAdmin(s)}>
                        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                      </button>
                    )}
                  </div>
                  {s.admins.length === 0 ? (
                    <p className="text-xs text-slate-500">No co-admin yet.</p>
                  ) : (
                    <ul className="grid gap-1">
                      {s.admins.map((ad) => (
                        <li key={ad.id} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{ad.name || ad.email}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {ad.email}
                              {ad.phone ? ` · ${ad.phone}` : ""}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {!ad.isActive && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">Off</span>}
                            {isOwner && (
                              <Button size="sm" variant="outline" onClick={() => openAdmin(s, ad)}>
                                Edit
                              </Button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <p className="mt-3 text-xs text-slate-500">
          To move a city to another store, or add a new city, use{" "}
          <Link href="/admin/service-areas" className="text-blue-700 underline">
            Cities
          </Link>
          .
        </p>
      )}

      <Sheet open={storeSheet !== null} onOpenChange={(o) => !o && setStoreSheet(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[92vh] max-w-md overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{storeSheet?.mode === "create" ? "Add a store" : `Edit ${storeSheet?.store?.name}`}</SheetTitle>
            <SheetDescription>
              {storeSheet?.store?.isMain ? "Your own store. Everything the technicians pay comes to you." : "What technicians pay, and how it is shared between you and the store."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={saveStore} className="mt-3 grid gap-3">
            <Field id="s-name" label="Store name">
              <Input id="s-name" className="h-11" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} required />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field id="s-rate" label="Technician pays (%)" hint="Of the service charge">
                <Input id="s-rate" type="number" inputMode="decimal" step="0.01" min={0} max={100} className="h-11" value={f.technicianRatePercent} onChange={(e) => setF({ ...f, technicianRatePercent: e.target.value })} required />
              </Field>
              {!storeSheet?.store?.isMain && (
                <Field id="s-owner" label="Your share (%)" hint="Out of that percentage">
                  <Input id="s-owner" type="number" inputMode="decimal" step="0.01" min={0} max={100} className="h-11" value={f.ownerRatePercent} onChange={(e) => setF({ ...f, ownerRatePercent: e.target.value })} required />
                </Field>
              )}
            </div>
            <Field id="s-flat" label="Flat amount per job (₹)" hint="Charged on top, and always yours. Use it for ads, store costs or salaries. 0 for none.">
              <Input id="s-flat" type="number" inputMode="decimal" step="0.01" min={0} className="h-11" value={f.flatAmount} onChange={(e) => setF({ ...f, flatAmount: e.target.value })} />
            </Field>
            <Field id="s-phone" label="New booking alert number" hint="Gets an SMS for every new booking in this store. Leave empty for none.">
              <Input id="s-phone" type="tel" inputMode="numeric" className="h-11" value={f.adminAlertPhone} onChange={(e) => setF({ ...f, adminAlertPhone: e.target.value })} placeholder="10 digit mobile number" />
            </Field>
            {storeSheet?.mode === "edit" && !storeSheet.store?.isMain && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
                Store is active (move its cities to another store before switching it off)
              </label>
            )}
            <p className="text-[11px] text-slate-500">New rates apply to jobs completed from now on. Finished jobs keep the terms they were done under.</p>
            <Button type="submit" className="h-11" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={adminSheet !== null} onOpenChange={(o) => !o && setAdminSheet(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[92vh] max-w-md overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{adminSheet?.mode === "create" ? "Add a co-admin" : "Edit co-admin"}</SheetTitle>
            <SheetDescription>{adminSheet?.store.name}. They see and manage only this store.</SheetDescription>
          </SheetHeader>
          <form onSubmit={saveAdmin} className="mt-3 grid gap-3">
            <Field id="a-name" label="Name">
              <Input id="a-name" className="h-11" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} maxLength={80} required />
            </Field>
            <Field id="a-email" label="Email (the login)">
              <Input id="a-email" type="email" className="h-11" value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} disabled={adminSheet?.mode === "edit"} required />
            </Field>
            <Field id="a-phone" label="Mobile number (optional)">
              <Input id="a-phone" type="tel" inputMode="numeric" className="h-11" value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} />
            </Field>
            <Field id="a-pass" label={adminSheet?.mode === "create" ? "Password" : "New password (leave empty to keep the current one)"} hint="At least 8 characters. Tell them in person, not by SMS.">
              <Input id="a-pass" type="text" autoComplete="off" className="h-11" value={a.password} onChange={(e) => setA({ ...a, password: e.target.value })} required={adminSheet?.mode === "create"} />
            </Field>
            {adminSheet?.mode === "edit" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={a.isActive} onChange={(e) => setA({ ...a, isActive: e.target.checked })} />
                Account is active (switching it off signs them out straight away)
              </label>
            )}
            <Button type="submit" className="h-11" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
