"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ImagePlus, Trash2 } from "lucide-react";
import { MdWhatsapp } from "react-icons/md";
import { BUSINESS } from "@/constants/business";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import type { TechnicianDetail } from "@/lib/domain/technicians";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import type { AdminAreaItem } from "@/lib/domain/serviceAreas";
import type { StoreItem } from "@/lib/domain/stores";

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
  storeId: string;
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
  storeId: t?.storeId ?? "",
});

const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export default function TechnicianForm({ technician }: { technician?: TechnicianDetail }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(toState(technician));
  const { me } = useAdmin();
  const isOwner = me?.isOwner ?? false;
  const [areas, setAreas] = useState<AdminAreaItem[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"photo" | "id" | null>(null);
  const [hasIdProof, setHasIdProof] = useState(technician?.hasIdProof ?? false);
  // Shown once after a technician is created or their PIN changes. The PIN cannot be looked up again.
  const [login, setLogin] = useState<{ id: string; name: string; email: string; phone: string; pin: string } | null>(null);

  useEffect(() => {
    fetch("/api/service-areas?all=true")
      .then((r) => r.json())
      .then((json) => json.status === "success" && setAreas(json.data))
      .catch(() => toast.error("Could not load districts"));
  }, []);

  // Only the owner chooses the store. A new technician starts in the owner's own store.
  useEffect(() => {
    if (!isOwner) return;
    fetch("/api/admin/stores")
      .then((r) => r.json())
      .then((json) => {
        if (json.status !== "success") return;
        const active: StoreItem[] = json.data.filter((s: StoreItem) => s.isActive);
        setStores(active);
        setForm((f) => (f.storeId ? f : { ...f, storeId: active.find((s) => s.isMain)?.id ?? active[0]?.id ?? "" }));
      })
      .catch(() => undefined);
  }, [isOwner]);

  // A technician works only in the cities of their own store.
  const storeAreas = isOwner && form.storeId ? areas.filter((a) => a.storeId === form.storeId) : areas;
  const changeStore = (id: string) =>
    setForm((f) => ({ ...f, storeId: id, serviceAreaIds: f.serviceAreaIds.filter((areaId) => areas.some((a) => a.id === areaId && a.storeId === id)) }));

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
        ...(isOwner && form.storeId ? { storeId: form.storeId } : {}),
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
        const id: string = json.data?.id ?? technician?.id;
        if (form.pin) {
          setLogin({ id, name: form.name, email: form.workEmail, phone: form.phone, pin: form.pin });
          setSaving(false);
        } else {
          router.push(`/admin/technicians/${id}`);
          router.refresh();
        }
      } else {
        setError(json.message || "Could not save");
        setSaving(false);
      }
    } catch {
      setError("Could not save. Please try again.");
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading("photo");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", "technicians");
      const res = await fetch("/api/admin/upload", { method: "POST", body: data });
      const json = await res.json();
      if (json.status === "success") {
        set("photo", json.data.url);
        toast.success("Photo uploaded. Save to keep it.");
      } else toast.error(json.message || "Could not upload the photo");
    } catch {
      toast.error("Could not upload the photo");
    } finally {
      setUploading(null);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  const uploadId = async (file: File) => {
    if (!technician) return;
    setUploading("id");
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch(`/api/admin/technicians/${technician.id}/id-proof`, { method: "POST", body: data });
      const json = await res.json();
      if (json.status === "success") {
        setHasIdProof(true);
        toast.success(json.message);
      } else toast.error(json.message || "Could not save the document");
    } catch {
      toast.error("Could not save the document");
    } finally {
      setUploading(null);
      if (idRef.current) idRef.current.value = "";
    }
  };

  const removeId = async () => {
    if (!technician || !window.confirm("Remove the ID document?")) return;
    try {
      const res = await fetch(`/api/admin/technicians/${technician.id}/id-proof`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "success") {
        setHasIdProof(false);
        toast.success(json.message);
      } else toast.error(json.message || "Could not remove it");
    } catch {
      toast.error("Could not remove it");
    }
  };

  const finishLogin = () => {
    const id = login?.id;
    setLogin(null);
    router.push(id ? `/admin/technicians/${id}` : "/admin/technicians");
    router.refresh();
  };

  const whatsappLogin = login
    ? `https://wa.me/91${login.phone}?text=${encodeURIComponent(`Hi ${login.name.split(" ")[0]}, your ${BUSINESS.name} technician login:\nEmail: ${login.email}\nPIN: ${login.pin}\nOpen: ${typeof window !== "undefined" ? window.location.origin : ""}/technician/login\nPlease do not share your PIN.`)}`
    : "";

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
      <h1 className="text-xl font-semibold">{technician ? `Edit ${technician.name}` : "Add technician"}</h1>

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
          <div className="flex items-center gap-3 sm:col-span-2">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-slate-100">
              {form.photo ? <Image src={form.photo} alt="" fill sizes="80px" className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center text-2xl font-semibold text-slate-400">{form.name.trim()[0]?.toUpperCase() ?? "?"}</span>}
            </div>
            <div className="grid gap-1">
              <input ref={photoRef} id="t-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploading === "photo"} onClick={() => photoRef.current?.click()}>
                  <ImagePlus className="mr-1 h-4 w-4" aria-hidden="true" /> {uploading === "photo" ? "Uploading..." : form.photo ? "Change photo" : "Add photo"}
                </Button>
                {form.photo && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("photo", "")}>
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">A clear face photo. JPG, PNG or WebP, up to 2 MB.</p>
            </div>
          </div>

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

          {isOwner && stores.length > 1 && (
            <Field id="t-store" label="Store" hint="Which store this technician belongs to. They pay this store, and work only in its cities.">
              <select id="t-store" value={form.storeId} onChange={(e) => changeStore(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isMain ? " (yours)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <fieldset>
            <legend className="text-sm font-medium mb-2">Districts they work in</legend>
            {storeAreas.length === 0 && <p className="text-xs text-muted-foreground">This store has no cities yet.</p>}
            <div className="flex flex-wrap gap-4">
              {storeAreas.map((a) => (
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

          <div className="sm:col-span-2 rounded-lg border bg-slate-50 p-3">
            <p className="text-sm font-medium">ID document photo</p>
            {technician ? (
              <>
                <p className="mb-2 text-xs text-muted-foreground">Private. Only admins who can see this technician can open it.</p>
                <input ref={idRef} id="t-idfile" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadId(e.target.files[0])} />
                <div className="flex flex-wrap items-center gap-2">
                  {hasIdProof && (
                    <Button asChild type="button" variant="outline" size="sm">
                      <a href={`/api/admin/technicians/${technician.id}/id-proof`} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" disabled={uploading === "id"} onClick={() => idRef.current?.click()}>
                    <ImagePlus className="mr-1 h-4 w-4" aria-hidden="true" /> {uploading === "id" ? "Uploading..." : hasIdProof ? "Replace" : "Add document"}
                  </Button>
                  {hasIdProof && (
                    <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={removeId}>
                      <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" /> Remove
                    </Button>
                  )}
                  <span className={`text-xs ${hasIdProof ? "text-emerald-700" : "text-muted-foreground"}`}>{hasIdProof ? "On file" : "Nothing on file"}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Save the technician first, then add the ID photo from their edit screen.</p>
            )}
          </div>
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
          <Button type="button" variant="outline" onClick={() => router.push(technician ? `/admin/technicians/${technician.id}` : "/admin/technicians")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <AlertDialog open={login !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login details for {login?.name}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-1 text-sm text-muted-foreground">
                <span>
                  Email: <strong className="text-foreground">{login?.email}</strong>
                </span>
                <span>
                  PIN: <strong className="font-mono text-lg text-foreground">{login?.pin}</strong>
                </span>
                <span className="pt-2">This PIN is shown only now and cannot be looked up later. Send it to the technician, then close this.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-between">
            <Button asChild variant="outline">
              <a href={whatsappLogin} target="_blank" rel="noopener noreferrer">
                <MdWhatsapp className="mr-1.5 h-4 w-4" aria-hidden="true" /> Send on WhatsApp
              </a>
            </Button>
            <AlertDialogAction onClick={finishLogin}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
