"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import type { TechnicianDetail } from "@/lib/domain/technicians";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const randomPin = () => String(Math.floor(100000 + Math.random() * 900000));

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface FormState {
  name: string;
  fatherName: string;
  phone: string;
  workEmail: string;
  address: string;
  age: string;
  gender: string;
  experienceYears: string;
  photo: string;
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  idType: string;
  idNumber: string;
  pin: string;
  unlock: boolean;
  isActive: boolean;
  specializations: ApplianceCategoryValue[];
  serviceAreaIds: string[];
}

const toState = (t?: TechnicianDetail): FormState => ({
  name: t?.name ?? "",
  fatherName: t?.fatherName ?? "",
  phone: t?.phone ?? "",
  workEmail: t?.workEmail ?? "",
  address: t?.address ?? "",
  age: t?.age?.toString() ?? "",
  gender: t?.gender ?? "",
  experienceYears: t?.experienceYears?.toString() ?? "",
  photo: t?.photo ?? "",
  accountHolderName: t?.accountHolderName ?? "",
  accountNumber: t?.accountNumber ?? "",
  ifsc: t?.ifsc ?? "",
  idType: t?.idType ?? "",
  idNumber: t?.idNumber ?? "",
  pin: "",
  unlock: false,
  isActive: t?.isActive ?? true,
  specializations: t?.specializations ?? [],
  serviceAreaIds: t?.serviceAreaIds ?? [],
});

const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export default function TechnicianForm({ technician }: { technician?: TechnicianDetail }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(toState(technician));
  const [areas, setAreas] = useState<ServiceAreaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/service-areas?all=true")
      .then((r) => r.json())
      .then((json) => json.status === "success" && setAreas(json.data))
      .catch(() => toast.error("Could not load districts"));
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const bind = (key: keyof FormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value as never),
  });

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!technician && !/^\d{6,10}$/.test(form.pin)) {
      setError("Set a PIN of 6 to 10 digits for the technician");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name,
        fatherName: form.fatherName,
        phone: form.phone,
        workEmail: form.workEmail,
        address: form.address,
        age: num(form.age),
        gender: form.gender || undefined,
        experienceYears: num(form.experienceYears),
        photo: form.photo,
        accountHolderName: form.accountHolderName,
        accountNumber: form.accountNumber,
        ifsc: form.ifsc,
        idType: form.idType,
        idNumber: form.idNumber,
        specializations: form.specializations,
        serviceAreaIds: form.serviceAreaIds,
        isActive: form.isActive,
        ...(technician ? { newPin: form.pin, unlock: form.unlock } : { pin: form.pin }),
      };
      const res = await fetch(technician ? `/api/admin/technicians/${technician.id}` : "/api/admin/technicians", {
        method: technician ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        router.push("/admin/technicians");
        router.refresh();
      } else {
        setError(json.message || "Could not save");
        setSaving(false);
      }
    } catch {
      setError("Could not save. Please try again.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!technician || !window.confirm(`Delete ${technician.name}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/technicians/${technician.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        router.push("/admin/technicians");
        router.refresh();
      } else {
        setError(json.message || "Could not delete");
        setSaving(false);
      }
    } catch {
      setError("Could not delete. Please try again.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mx-auto grid max-w-3xl gap-3">
      <h1 className="text-xl font-semibold">{technician ? technician.name : "Add technician"}</h1>

      {technician && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge className="bg-amber-600">{technician.rank}</Badge>
          <Badge variant="outline">{technician.jobsCompletedCount} jobs completed</Badge>
          <Badge variant="outline">
            {technician.ratingCount > 0 ? `${technician.averageRating.toFixed(2)} rating (${technician.ratingCount})` : "No ratings yet"}
          </Badge>
          {technician.isLocked && <Badge className="bg-red-600">Locked after wrong PINs</Badge>}
        </div>
      )}

      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-base">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 px-3 pb-3 sm:grid-cols-2">
          <Field id="t-name" label="Full name">
            <Input id="t-name" {...bind("name")} />
          </Field>
          <Field id="t-father" label="Father's name">
            <Input id="t-father" {...bind("fatherName")} />
          </Field>
          <Field id="t-age" label="Age">
            <Input id="t-age" type="number" inputMode="numeric" {...bind("age")} />
          </Field>
          <Field id="t-gender" label="Gender">
            <select id="t-gender" className={selectClass} {...bind("gender")}>
              <option value="">Not set</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field id="t-phone" label="Mobile number">
            <Input id="t-phone" type="tel" inputMode="numeric" {...bind("phone")} />
          </Field>
          <Field id="t-exp" label="Experience (years)">
            <Input id="t-exp" type="number" inputMode="numeric" {...bind("experienceYears")} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="t-address" label="Address">
              <Input id="t-address" {...bind("address")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="t-photo" label="Photo" hint="A path like /photo.jpg or an https link. Uploads come later.">
              <Input id="t-photo" {...bind("photo")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-base">Login and work</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 px-3 pb-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="t-email" label="Work email" hint="The technician logs in with this email and a PIN.">
              <Input id="t-email" type="email" autoComplete="off" {...bind("workEmail")} />
            </Field>
            <Field
              id="t-pin"
              label={technician ? "New PIN" : "PIN"}
              hint={technician ? "Leave blank to keep the current PIN. Setting one signs the technician out everywhere." : "6 to 10 digits. Tell the technician; it cannot be viewed again."}
            >
              <div className="flex gap-2">
                <Input id="t-pin" inputMode="numeric" autoComplete="off" {...bind("pin")} />
                <Button type="button" variant="outline" onClick={() => set("pin", randomPin())}>
                  Generate
                </Button>
              </div>
            </Field>
          </div>

          <fieldset>
            <legend className="text-sm font-medium mb-2">Appliances they repair</legend>
            <div className="flex flex-wrap gap-4">
              {APPLIANCE_CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.specializations.includes(c)}
                    onChange={() => set("specializations", toggle(form.specializations, c))}
                  />
                  {CATEGORY_LABELS[c]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium mb-2">Districts they work in</legend>
            <div className="flex flex-wrap gap-4">
              {areas.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.serviceAreaIds.includes(a.id)}
                    onChange={() => set("serviceAreaIds", toggle(form.serviceAreaIds, a.id))}
                  />
                  {a.district}
                  {!a.isActive && <span className="text-xs text-muted-foreground">(closed)</span>}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
            Active (can log in and be assigned jobs)
          </label>
          {technician?.isLocked && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={form.unlock} onChange={(e) => set("unlock", e.target.checked)} />
              Unlock this account now
            </label>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-base">Bank and ID (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 px-3 pb-3 sm:grid-cols-2">
          <Field id="t-holder" label="Account holder name">
            <Input id="t-holder" {...bind("accountHolderName")} />
          </Field>
          <Field id="t-account" label="Account number">
            <Input id="t-account" inputMode="numeric" autoComplete="off" {...bind("accountNumber")} />
          </Field>
          <Field id="t-ifsc" label="IFSC">
            <Input id="t-ifsc" autoComplete="off" {...bind("ifsc")} />
          </Field>
          <span />
          <Field id="t-idtype" label="ID type" hint="For example Aadhaar or PAN. Stored for your records, not verified.">
            <Input id="t-idtype" {...bind("idType")} />
          </Field>
          <Field id="t-idnumber" label="ID number">
            <Input id="t-idnumber" autoComplete="off" {...bind("idNumber")} />
          </Field>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {technician ? (
          <Button type="button" variant="outline" className="text-red-600" onClick={remove} disabled={saving}>
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/technicians")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
