"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Copy, ImagePlus, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle, Panel } from "@/components/custom/admin/ui";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, SERVICE_TYPE_SUGGESTIONS, SUB_TYPES, type ApplianceCategoryValue } from "@/constants/appliances";
import { ServiceCreateSchema, ServiceInputSchema } from "@/schema/service";
import type { ServiceItem } from "@/types/service";

const FALLBACK_IMAGE = "/service_half1.jpeg";
const GUARANTEE_CHOICES = [0, 7, 15, 30, 90];
const fieldClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ id, label, error, hint, children }: { id?: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-[11px] text-slate-500">{hint}</p>
      )}
    </div>
  );
}

// `service` edits an existing one. `copyOf` starts a new service filled in from another.
export default function ServiceForm({ service, copyOf }: { service?: ServiceItem; copyOf?: ServiceItem }) {
  const router = useRouter();
  const base = service ?? copyOf;
  const editing = !!service;
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ApplianceCategoryValue>(base?.applianceCategory ?? "AC");
  const [subTypes, setSubTypes] = useState<string[]>(base ? [base.applianceSubType] : [SUB_TYPES.AC[0]]);
  const [name, setName] = useState(base?.serviceType ?? "");
  const [price, setPrice] = useState(String(base?.price ?? ""));
  const [days, setDays] = useState(String(base?.warrantyDurationDays ?? 0));
  const [bullets, setBullets] = useState<string[]>(base?.desc?.length ? base.desc : [""]);
  const [image, setImage] = useState(base?.image ?? "");
  const [useLink, setUseLink] = useState(false);
  const [isActive, setIsActive] = useState(base?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(!!copyOf);

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  const pickCategory = (c: ApplianceCategoryValue) => {
    setCategory(c);
    setSubTypes([SUB_TYPES[c][0]]);
    setDirty(true);
  };

  const toggleSubType = (t: string) => {
    if (editing) return setSubTypes([t]);
    setSubTypes((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));
    setDirty(true);
  };

  const setBullet = (i: number, v: string) => {
    setBullets((list) => list.map((b, idx) => (idx === i ? v : b)));
    setDirty(true);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "services");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();
      if (json.status === "success") {
        setImage(json.data.url);
        setDirty(true);
        toast.success("Image uploaded");
      } else toast.error(json.message || "Could not upload the image");
    } catch {
      toast.error("Could not upload the image");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = bullets.map((b) => b.trim()).filter(Boolean);
    const common = { applianceCategory: category, serviceType: name, price: price === "" ? NaN : Number(price), warrantyDurationDays: days === "" ? NaN : Number(days), image, desc, isActive };
    const payload = editing ? { ...common, applianceSubType: subTypes[0] } : { ...common, applianceSubTypes: subTypes };

    const parsed = (editing ? ServiceInputSchema : ServiceCreateSchema).safeParse(payload);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0] ?? "form")] ??= issue.message;
      setErrors(map);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/services/${service!.id}` : "/api/services", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        setDirty(false);
        router.push("/admin/services");
        router.refresh();
      } else {
        toast.error(json.message || "Could not save");
        setSaving(false);
      }
    } catch {
      toast.error("Could not save. Please try again.");
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!service || !window.confirm(`Delete "${service.serviceType}" (${service.applianceSubType})? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        router.push("/admin/services");
        router.refresh();
      } else {
        toast.error(json.message || "Could not delete");
        setSaving(false);
      }
    } catch {
      toast.error("Could not delete. Please try again.");
      setSaving(false);
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm("Leave without saving your changes?")) return;
    router.push("/admin/services");
  };

  const previewBullets = bullets.map((b) => b.trim()).filter(Boolean);
  const daysNumber = Number(days);

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl pb-20" noValidate>
      <button type="button" onClick={cancel} className="mb-1 inline-flex items-center gap-1 text-sm text-blue-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Services
      </button>
      <PageTitle title={editing ? "Edit service" : copyOf ? "Copy service" : "Add service"} sub={copyOf ? `Copied from ${copyOf.serviceType} (${copyOf.applianceSubType}). Choose the type it is for.` : undefined} />

      <div className="grid gap-3">
        <Panel title="What it is">
          <div className="grid gap-3">
            <Field id="appliance" label="Appliance">
              <select id="appliance" className={fieldClass} value={category} onChange={(e) => pickCategory(e.target.value as ApplianceCategoryValue)}>
                {APPLIANCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={editing ? "Type" : "Types this service is for"} error={errors.applianceSubTypes ?? errors.applianceSubType} hint={editing ? undefined : "Tick every type it applies to. One service is created for each."}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Types">
                {SUB_TYPES[category].map((t) => {
                  const on = subTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSubType(t)}
                      className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${on ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field id="name" label="Service name" error={errors.serviceType}>
              <Input id="name" className="h-11" placeholder="e.g. AC Repair" value={name} onChange={(e) => touch(setName)(e.target.value)} maxLength={80} />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {SERVICE_TYPE_SUGGESTIONS[category].map((s) => (
                  <button key={s} type="button" onClick={() => touch(setName)(s)} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200">
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Panel>

        <Panel title="Price and guarantee">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="price" label="Price (₹)" error={errors.price}>
              <Input id="price" type="number" inputMode="numeric" min={0} className="h-11" value={price} onFocus={(e) => e.target.select()} onChange={(e) => touch(setPrice)(e.target.value)} />
            </Field>
            <Field id="days" label="Guarantee (days)" error={errors.warrantyDurationDays} hint="0 means no guarantee. Customers can claim a free re-service while it runs.">
              <Input id="days" type="number" inputMode="numeric" min={0} className="h-11" value={days} onFocus={(e) => e.target.select()} onChange={(e) => touch(setDays)(e.target.value)} />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {GUARANTEE_CHOICES.map((d) => (
                  <button key={d} type="button" onClick={() => touch(setDays)(String(d))} className={`rounded-full px-2.5 py-1 text-xs ${Number(days) === d && days !== "" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                    {d === 0 ? "None" : `${d} days`}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Panel>

        <Panel title="What is included">
          <div className="grid gap-2">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <label htmlFor={`bullet-${i}`} className="sr-only">
                  Point {i + 1}
                </label>
                <Input id={`bullet-${i}`} className="h-11" value={b} maxLength={300} placeholder="e.g. Free visit and diagnosis" onChange={(e) => setBullet(i, e.target.value)} />
                <button
                  type="button"
                  aria-label={`Remove point ${i + 1}`}
                  onClick={() => {
                    setBullets((list) => (list.length === 1 ? [""] : list.filter((_, idx) => idx !== i)));
                    setDirty(true);
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-slate-500"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {errors.desc && (
              <p role="alert" className="text-xs text-red-600">
                {errors.desc}
              </p>
            )}
            {bullets.length < 10 && (
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setBullets((l) => [...l, ""])}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add a point
              </Button>
            )}
          </div>
        </Panel>

        <Panel title="Photo">
          <div className="flex items-start gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-slate-100">
              <Image src={image || FALLBACK_IMAGE} alt="" fill sizes="96px" className="object-cover" unoptimized />
            </div>
            <div className="grid min-w-0 flex-1 gap-2">
              <input ref={fileRef} id="service-image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="mr-1 h-4 w-4" aria-hidden="true" /> {uploading ? "Uploading..." : image ? "Change photo" : "Upload photo"}
                </Button>
                {image && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setImage(""); setDirty(true); }}>
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">JPG, PNG or WebP, up to 2 MB. Without a photo the standard one is used.</p>
              <button type="button" className="justify-self-start text-[11px] text-blue-700 underline" onClick={() => setUseLink((v) => !v)}>
                {useLink ? "Hide link box" : "Use a link instead"}
              </button>
              {useLink && (
                <Field id="image-link" label="Image link" error={errors.image}>
                  <Input id="image-link" className="h-11" placeholder="https://... or /image.jpg" value={image} onChange={(e) => touch(setImage)(e.target.value)} />
                </Field>
              )}
              {!useLink && errors.image && (
                <p role="alert" className="text-xs text-red-600">
                  {errors.image}
                </p>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Show to customers">
          <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm">
            <span>
              <span className="font-medium">{isActive ? "Shown on the website and open for bookings" : "Hidden from the website"}</span>
              <span className="block text-xs text-slate-500">Hide a service you do not offer for now. You can show it again any time.</span>
            </span>
            <button type="button" role="switch" aria-checked={isActive} aria-label="Show on the website" onClick={() => touch(setIsActive)(!isActive)} className={`relative h-7 w-12 shrink-0 rounded-full ${isActive ? "bg-emerald-600" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${isActive ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </label>
        </Panel>

        <Panel title="How customers will see it">
          <div className="flex gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {name || "Service name"} <span className="text-xs font-normal text-slate-500">({subTypes.join(" / ") || "type"})</span>
              </p>
              <p className="text-sm font-semibold text-green-600">₹ {price || 0}</p>
              {daysNumber > 0 && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {daysNumber}-day guarantee
                </p>
              )}
              <ul className="mt-1 list-disc pl-4 text-[11px] italic text-slate-600">
                {previewBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded">
              <Image src={image || FALLBACK_IMAGE} alt="" fill sizes="80px" className="object-cover" unoptimized />
            </div>
          </div>
        </Panel>

        {editing && (
          <Panel title="More">
            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" variant="outline" size="sm">
                <Link href={`/admin/services/new?copy=${service!.id}`}>
                  <Copy className="mr-1 h-4 w-4" aria-hidden="true" /> Duplicate
                </Link>
              </Button>
              <Button type="button" variant="outline" size="sm" className="text-red-600" onClick={onDelete} disabled={saving}>
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" /> Delete
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">A service that already has bookings cannot be deleted. Hide it instead.</p>
          </Panel>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-30 border-t bg-white p-2 shadow-lg md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={cancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-[2]" disabled={saving || uploading}>
            {saving ? "Saving..." : editing ? "Save changes" : subTypes.length > 1 ? `Create ${subTypes.length} services` : "Create service"}
          </Button>
        </div>
      </div>
    </form>
  );
}
