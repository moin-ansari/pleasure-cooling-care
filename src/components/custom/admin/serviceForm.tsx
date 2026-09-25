"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLIANCE_CATEGORIES,
  CATEGORY_LABELS,
  SERVICE_TYPE_SUGGESTIONS,
  SUB_TYPES,
} from "@/constants/appliances";
import { ServiceInput, ServiceInputSchema } from "@/schema/service";
import type { ServiceItem } from "@/types/service";

const fieldClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const Field = ({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) => (
  <div className="grid gap-1.5">
    <Label>{label}</Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

export default function ServiceForm({ service }: { service?: ServiceItem }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [descText, setDescText] = useState((service?.desc ?? []).join("\n"));

  const form = useForm<ServiceInput>({
    resolver: zodResolver(ServiceInputSchema),
    defaultValues: {
      applianceCategory: service?.applianceCategory ?? "AC",
      applianceSubType: service?.applianceSubType ?? SUB_TYPES.AC[0],
      serviceType: service?.serviceType ?? "",
      price: service?.price ?? 0,
      warrantyDurationDays: service?.warrantyDurationDays ?? 0,
      image: service?.image ?? "",
      desc: service?.desc ?? [],
      isActive: service?.isActive ?? true,
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;
  const category = watch("applianceCategory");

  const onSubmit = async (values: ServiceInput) => {
    setSaving(true);
    try {
      const desc = descText.split("\n").map((line) => line.trim()).filter(Boolean);
      const res = await fetch(service ? `/api/services/${service.id}` : "/api/services", {
        method: service ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, desc }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
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

  return (
    <div className="p-3 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{service ? "Edit service" : "Add service"}</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Appliance" error={errors.applianceCategory?.message}>
                <select
                  className={fieldClass}
                  {...register("applianceCategory", {
                    onChange: (e) => setValue("applianceSubType", SUB_TYPES[e.target.value as keyof typeof SUB_TYPES][0]),
                  })}
                >
                  {APPLIANCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type" error={errors.applianceSubType?.message}>
                <select className={fieldClass} {...register("applianceSubType")}>
                  {SUB_TYPES[category].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Service name" error={errors.serviceType?.message}>
              <Input list="service-suggestions" placeholder="e.g. AC Repair" {...register("serviceType")} />
              <datalist id="service-suggestions">
                {SERVICE_TYPE_SUGGESTIONS[category].map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price (₹)" error={errors.price?.message}>
                <Input type="number" inputMode="numeric" min={0} onFocus={(e) => e.target.select()} {...register("price", { valueAsNumber: true })} />
              </Field>
              <Field label="Guarantee (days)" error={errors.warrantyDurationDays?.message} hint="0 means no guarantee">
                <Input type="number" inputMode="numeric" min={0} onFocus={(e) => e.target.select()} {...register("warrantyDurationDays", { valueAsNumber: true })} />
              </Field>
            </div>

            <Field label="Image" error={errors.image?.message} hint="A path like /service_half1.jpeg or an https link. Uploads come later.">
              <Input placeholder="/service_half1.jpeg" {...register("image")} />
            </Field>

            <Field label="Description" hint="One point per line. Shown as bullets on the service card.">
              <textarea
                className={`${fieldClass} h-28`}
                value={descText}
                onChange={(e) => setDescText(e.target.value)}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register("isActive")} />
              Show on the website and allow bookings
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {service ? (
                <Button type="button" variant="outline" className="text-red-600" onClick={onDelete} disabled={saving}>
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.push("/admin/services")} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
