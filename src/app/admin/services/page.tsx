"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CheckSquare, Pencil, Plus, Search, ShieldCheck, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { Chips, EmptyState, ListSkeleton, PageTitle } from "@/components/custom/admin/ui";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import { bulkPrice } from "@/schema/service";
import type { AdminServiceItem } from "@/lib/domain/services";

type Category = ApplianceCategoryValue | "ALL";
type Status = "all" | "shown" | "hidden";
type PriceMode = "setPrice" | "changePercent" | "changeAmount";

const PRICE_MODES: { key: PriceMode; label: string; hint: string }[] = [
  { key: "changePercent", label: "Change by %", hint: "10 raises prices by 10%. -10 lowers them by 10%." },
  { key: "changeAmount", label: "Add or subtract ₹", hint: "50 adds ₹50 to each. -50 takes ₹50 off." },
  { key: "setPrice", label: "Set one price", hint: "Every selected service gets this price." },
];

async function call(url: string, method: string, body: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-emerald-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function ServicesPage() {
  const { me } = useAdmin();
  // Only the owner can change services and prices. Co-admins can look.
  const canEdit = me?.isOwner ?? false;
  const [services, setServices] = useState<AdminServiceItem[] | null>(null);
  const [category, setCategory] = useState<Category>("ALL");
  const [status, setStatus] = useState<Status>("all");
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminServiceItem | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDays, setEditDays] = useState("");
  const [saving, setSaving] = useState(false);

  const [priceOpen, setPriceOpen] = useState(false);
  const [mode, setMode] = useState<PriceMode>("changePercent");
  const [value, setValue] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/services?all=true");
      const json = await res.json();
      if (json.status === "success") setServices(json.data);
      else toast.error(json.message || "Could not load services");
    } catch {
      toast.error("Could not load services");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (services ?? []).filter(
      (s) =>
        (category === "ALL" || s.applianceCategory === category) &&
        (status === "all" || (status === "shown" ? s.isActive : !s.isActive)) &&
        (!q || `${s.serviceType} ${s.applianceSubType} ${CATEGORY_LABELS[s.applianceCategory]}`.toLowerCase().includes(q))
    );
  }, [services, category, status, query]);

  const groups = useMemo(() => APPLIANCE_CATEGORIES.map((c) => ({ category: c, items: visible.filter((s) => s.applianceCategory === c) })).filter((g) => g.items.length > 0), [visible]);

  const toggleActive = async (s: AdminServiceItem, isActive: boolean) => {
    setBusyId(s.id);
    try {
      const json = await call(`/api/services/${s.id}`, "PATCH", { isActive });
      if (json.status === "success") {
        setServices((list) => list && list.map((x) => (x.id === s.id ? { ...x, isActive } : x)));
        toast.success(isActive ? "Now shown to customers" : "Hidden from customers");
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (s: AdminServiceItem) => {
    setEditing(s);
    setEditPrice(String(s.price));
    setEditDays(String(s.warrantyDurationDays));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const json = await call(`/api/services/${editing.id}`, "PATCH", { price: Number(editPrice), warrantyDurationDays: Number(editDays) });
      if (json.status === "success") {
        setServices((list) => list && list.map((x) => (x.id === editing.id ? { ...x, price: json.data.price, warrantyDurationDays: json.data.warrantyDurationDays } : x)));
        toast.success("Saved");
        setEditing(null);
      } else toast.error(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const bulk = async (body: object) => {
    setSaving(true);
    try {
      const json = await call("/api/services/bulk", "POST", { ids: Array.from(selected), ...body });
      if (json.status === "success") {
        toast.success(json.message);
        setPriceOpen(false);
        setValue("");
        stopSelecting();
        await load();
      } else toast.error(json.message || "Could not update");
    } catch {
      toast.error("Could not update");
    } finally {
      setSaving(false);
    }
  };

  const chosen = (services ?? []).filter((s) => selected.has(s.id));
  const numericValue = Number(value);
  const valueOk = value.trim() !== "" && Number.isFinite(numericValue) && (mode !== "changePercent" || (numericValue >= -90 && numericValue <= 300)) && (mode === "changePercent" || Number.isInteger(numericValue));
  const preview = valueOk ? chosen.slice(0, 3).map((s) => ({ s, next: bulkPrice(s.price, mode, numericValue) })) : [];

  return (
    <div className={selecting ? "pb-36" : "pb-6"}>
      <PageTitle
        title="Services"
        sub={services ? `${services.length} services · ${services.filter((s) => s.isActive).length} shown to customers` : undefined}
        action={
          canEdit && (
            <div className="flex gap-2">
              <Button size="sm" variant={selecting ? "default" : "outline"} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
                {selecting ? "Done" : "Select"}
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/services/new">
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add
                </Link>
              </Button>
            </div>
          )
        }
      />

      <div className="relative mb-2">
        <label htmlFor="service-search" className="sr-only">
          Search services
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input id="service-search" className="h-11 bg-white pl-9" placeholder="Search services" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mb-3 grid gap-2">
        <Chips<Category>
          label="Appliance"
          value={category}
          onChange={setCategory}
          options={[{ key: "ALL", label: "All" }, ...APPLIANCE_CATEGORIES.map((c) => ({ key: c as Category, label: CATEGORY_LABELS[c] }))]}
        />
        <Chips<Status>
          label="Visibility"
          value={status}
          onChange={setStatus}
          options={[
            { key: "all", label: "Any status" },
            { key: "shown", label: "Shown", count: services?.filter((s) => s.isActive).length },
            { key: "hidden", label: "Hidden", count: services?.filter((s) => !s.isActive).length },
          ]}
        />
      </div>

      {services === null ? (
        <ListSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState title={query || category !== "ALL" || status !== "all" ? "No services match" : "No services yet"} text={services.length === 0 ? "Add your first service to show it on the website." : undefined} />
      ) : (
        <div className="grid gap-4">
          {groups.map((g) => (
            <section key={g.category} aria-labelledby={`h-${g.category}`}>
              <h2 id={`h-${g.category}`} className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {CATEGORY_LABELS[g.category]} · {g.items.length}
              </h2>
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {g.items.map((s) => (
                  <li key={s.id} className={`rounded-xl border bg-white p-3 shadow-sm ${s.isActive ? "" : "bg-slate-50"} ${selected.has(s.id) ? "border-blue-600 ring-1 ring-blue-600" : ""}`}>
                    <div className="flex items-start gap-2">
                      {selecting && (
                        <button type="button" onClick={() => toggleSelect(s.id)} aria-label={`${selected.has(s.id) ? "Deselect" : "Select"} ${s.serviceType} ${s.applianceSubType}`} aria-pressed={selected.has(s.id)} className="mt-0.5 shrink-0 text-blue-700">
                          {selected.has(s.id) ? <CheckSquare className="h-6 w-6" aria-hidden="true" /> : <Square className="h-6 w-6 text-slate-400" aria-hidden="true" />}
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold leading-tight ${s.isActive ? "text-slate-900" : "text-slate-500"}`}>{s.serviceType}</p>
                        <p className="text-xs text-slate-500">{s.applianceSubType}</p>
                      </div>
                      {canEdit ? (
                        <button type="button" onClick={() => openEdit(s)} className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-base font-bold text-blue-800" aria-label={`Change price of ${s.serviceType} ${s.applianceSubType}, now ₹${s.price}`}>
                          ₹{s.price}
                        </button>
                      ) : (
                        <span className="shrink-0 px-1 text-base font-bold text-blue-800">₹{s.price}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          {s.warrantyDurationDays ? `${s.warrantyDurationDays}-day guarantee` : "No guarantee"}
                        </span>
                        <span className="ml-2 text-slate-400">{s.bookingCount} {s.bookingCount === 1 ? "booking" : "bookings"}</span>
                      </div>
                      {canEdit ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Link href={`/admin/services/${s.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label={`Edit ${s.serviceType} ${s.applianceSubType}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Switch on={s.isActive} disabled={busyId === s.id} label={`${s.isActive ? "Hide" : "Show"} ${s.serviceType} ${s.applianceSubType} on the website`} onChange={(v) => toggleActive(s, v)} />
                      </div>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{s.isActive ? "Shown" : "Hidden"}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-30 border-t bg-white p-2 shadow-lg md:bottom-0 md:left-60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <span className="mr-auto text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set(visible.map((s) => s.id)))}>
              All {visible.length}
            </Button>
            <Button size="sm" variant="outline" disabled={selected.size === 0 || saving} onClick={() => bulk({ action: "show" })}>
              Show
            </Button>
            <Button size="sm" variant="outline" disabled={selected.size === 0 || saving} onClick={() => bulk({ action: "hide" })}>
              Hide
            </Button>
            <Button size="sm" disabled={selected.size === 0 || saving} onClick={() => setPriceOpen(true)}>
              Change price
            </Button>
          </div>
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{editing?.serviceType}</SheetTitle>
            <SheetDescription>{editing && `${CATEGORY_LABELS[editing.applianceCategory]}, ${editing.applianceSubType}`}</SheetDescription>
          </SheetHeader>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-1">
              <label htmlFor="q-price" className="text-xs font-medium">
                Price (₹)
              </label>
              <Input id="q-price" type="number" inputMode="numeric" min={0} className="h-11" value={editPrice} onFocus={(e) => e.target.select()} onChange={(e) => setEditPrice(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <label htmlFor="q-days" className="text-xs font-medium">
                Guarantee (days, 0 for none)
              </label>
              <Input id="q-days" type="number" inputMode="numeric" min={0} className="h-11" value={editDays} onFocus={(e) => e.target.select()} onChange={(e) => setEditDays(e.target.value)} />
            </div>
            <Button onClick={saveEdit} disabled={saving || editPrice === "" || editDays === ""} className="h-11">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={priceOpen} onOpenChange={setPriceOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Change price of {selected.size} {selected.size === 1 ? "service" : "services"}</SheetTitle>
            <SheetDescription>{PRICE_MODES.find((m) => m.key === mode)?.hint}</SheetDescription>
          </SheetHeader>
          <div className="mt-3 grid gap-3">
            <Chips<PriceMode> label="How" value={mode} onChange={(m) => { setMode(m); setValue(""); }} options={PRICE_MODES.map((m) => ({ key: m.key, label: m.label }))} />
            <div className="grid gap-1">
              <label htmlFor="b-value" className="text-xs font-medium">
                {mode === "changePercent" ? "Percent" : "Rupees"}
              </label>
              <Input id="b-value" type="number" inputMode="numeric" className="h-11" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            {preview.length > 0 && (
              <ul className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                {preview.map(({ s, next }) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.serviceType} ({s.applianceSubType})</span>
                    <span className="shrink-0">₹{s.price} → <strong>₹{next}</strong></span>
                  </li>
                ))}
                {chosen.length > preview.length && <li className="text-slate-500">and {chosen.length - preview.length} more</li>}
              </ul>
            )}
            <Button className="h-11" disabled={saving || !valueOk} onClick={() => bulk({ action: mode, value: numericValue })}>
              {saving ? "Saving..." : "Apply"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
