"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { ListSkeleton, PageTitle, Panel } from "@/components/custom/admin/ui";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import { MAX_BOOKING_DAYS_AHEAD, MIN_LEAD_MINUTES, TIME_SLOTS } from "@/constants/booking";
import { BookingInputSchema } from "@/schema/booking";
import { normalizeIndianMobile } from "@/lib/phone";
import { addDaysToDateString, istDateString, istMinutesOfDay, slotToMinutes } from "@/lib/time";
import type { ServiceItem } from "@/types/service";
import type { AdminAreaItem } from "@/lib/domain/serviceAreas";

// Slots still bookable on a day. Today, only ones far enough ahead.
const slotsFor = (date: string) => (date === istDateString() ? TIME_SLOTS.filter((t) => slotToMinutes(t) >= istMinutesOfDay() + MIN_LEAD_MINUTES) : [...TIME_SLOTS]);

const selectClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

const addDaysToDate = (d: string) => addDaysToDateString(d, 1);

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
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

// A booking for a customer who phoned. It follows the same rules as the website, and the customer gets the usual message.
export default function NewBookingPage() {
  const router = useRouter();
  const { cityId } = useAdmin();
  const today = istDateString();

  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [areas, setAreas] = useState<AdminAreaItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [category, setCategory] = useState<ApplianceCategoryValue>("AC");
  const [subType, setSubType] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [town, setTown] = useState("");
  const [pincode, setPincode] = useState("");
  const [street, setStreet] = useState("");
  // Start on the first day that still has a bookable slot.
  const firstDay = slotsFor(today).length ? today : addDaysToDate(today);
  const [date, setDate] = useState(firstDay);
  const [time, setTime] = useState<string>(slotsFor(firstDay)[0] ?? TIME_SLOTS[0]);
  const slots = slotsFor(date);

  useEffect(() => {
    Promise.all([fetch("/api/services").then((r) => r.json()), fetch("/api/service-areas?all=true").then((r) => r.json())])
      .then(([s, a]) => {
        if (s.status === "success") setServices(s.data);
        if (a.status === "success") {
          const open = (a.data as AdminAreaItem[]).filter((x) => x.isActive);
          setAreas(open);
          setAreaId((cur) => cur || (cityId && open.some((x) => x.id === cityId) ? cityId : open[0]?.id ?? ""));
        }
      })
      .catch(() => toast.error("Could not load services and cities"));
  }, [cityId]);

  const categories = useMemo(() => APPLIANCE_CATEGORIES.filter((c) => (services ?? []).some((s) => s.applianceCategory === c)), [services]);
  const subTypes = useMemo(() => Array.from(new Set((services ?? []).filter((s) => s.applianceCategory === category).map((s) => s.applianceSubType))), [services, category]);
  const options = useMemo(() => (services ?? []).filter((s) => s.applianceCategory === category && s.applianceSubType === subType), [services, category, subType]);

  // Keep the dependent choices valid as the earlier ones change.
  useEffect(() => {
    if (categories.length && !categories.includes(category)) setCategory(categories[0]);
  }, [categories, category]);
  useEffect(() => {
    if (subTypes.length && !subTypes.includes(subType)) setSubType(subTypes[0]);
  }, [subTypes, subType]);
  useEffect(() => {
    if (options.length && !options.some((o) => o.id === serviceId)) setServiceId(options[0].id);
  }, [options, serviceId]);

  // Changing the day keeps the time valid.
  useEffect(() => {
    if (slots.length && !slots.some((t) => t === time)) setTime(slots[0]);
  }, [slots, time]);

  const chosen = services?.find((s) => s.id === serviceId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { customerName: name, mobile: normalizeIndianMobile(mobile), serviceId, serviceAreaId: areaId, town, pincode, streetAddress: street, date, time, idempotencyKey: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    const parsed = BookingInputSchema.safeParse(payload);
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
      const res = await fetch("/api/admin/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(`Booking ${json.data.bookingRef} created`);
        router.push(`/admin/bookings/${json.data.id}`);
      } else {
        toast.error(json.message || "Could not create the booking");
        setSaving(false);
      }
    } catch {
      toast.error("Could not create the booking");
      setSaving(false);
    }
  };

  if (!services || !areas) return <ListSkeleton rows={3} />;

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl pb-20" noValidate>
      <Link href="/admin/bookings" className="mb-1 inline-flex items-center gap-1 text-sm text-blue-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Bookings
      </Link>
      <PageTitle title="New booking" sub="For a customer who phoned. They will get the usual confirmation message." />

      <div className="grid gap-3">
        <Panel title="Customer">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="nb-name" label="Name" error={errors.customerName}>
              <Input id="nb-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" />
            </Field>
            <Field id="nb-mobile" label="Mobile number" error={errors.mobile}>
              <Input id="nb-mobile" type="tel" inputMode="numeric" className="h-11" value={mobile} onChange={(e) => setMobile(e.target.value)} autoComplete="off" />
            </Field>
          </div>
        </Panel>

        <Panel title="Service">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="nb-cat" label="Appliance">
              <select id="nb-cat" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as ApplianceCategoryValue)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="nb-sub" label="Type">
              <select id="nb-sub" className={selectClass} value={subType} onChange={(e) => setSubType(e.target.value)}>
                {subTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field id="nb-service" label="Service" error={errors.serviceId} hint={chosen ? `₹${chosen.price}${chosen.warrantyDurationDays ? ` · ${chosen.warrantyDurationDays}-day guarantee` : ""}` : undefined}>
                <select id="nb-service" className={selectClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.serviceType} · ₹{o.price}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="Where and when">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="nb-area" label="City" error={errors.serviceAreaId}>
              <select id="nb-area" className={selectClass} value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.district}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="nb-town" label="Town, village or locality" error={errors.town}>
              <Input id="nb-town" className="h-11" value={town} onChange={(e) => setTown(e.target.value)} maxLength={80} />
            </Field>
            <Field id="nb-pin" label="Pincode" error={errors.pincode}>
              <Input id="nb-pin" inputMode="numeric" maxLength={6} className="h-11" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </Field>
            <Field id="nb-street" label="Street or landmark" error={errors.streetAddress}>
              <Input id="nb-street" className="h-11" value={street} onChange={(e) => setStreet(e.target.value)} maxLength={200} />
            </Field>
            <Field id="nb-date" label="Date" error={errors.date}>
              <Input id="nb-date" type="date" className="h-11" min={today} max={addDaysToDateString(today, MAX_BOOKING_DAYS_AHEAD)} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field id="nb-time" label="Time" error={errors.time}>
              <select id="nb-time" className={selectClass} value={time} onChange={(e) => setTime(e.target.value)}>
                {slots.length === 0 && <option value="">No slots left today. Choose another day.</option>}
                {slots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-30 border-t bg-white p-2 shadow-lg md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => router.push("/admin/bookings")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-[2]" disabled={saving || !serviceId || !areaId}>
            {saving ? "Creating..." : "Create booking"}
          </Button>
        </div>
      </div>
    </form>
  );
}
