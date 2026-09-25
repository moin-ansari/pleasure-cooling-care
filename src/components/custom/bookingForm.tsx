"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { MdCheckCircleOutline, MdMyLocation } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, SUB_TYPES, type ApplianceCategoryValue } from "@/constants/appliances";
import { MAX_BOOKING_DAYS_AHEAD, TIME_SLOTS } from "@/constants/booking";
import { BookingInputSchema } from "@/schema/booking";
import { normalizeIndianMobile } from "@/lib/phone";
import { addDaysToDateString, istDateString } from "@/lib/time";
import { captureAttribution, readAttribution } from "@/lib/attribution";
import type { ServiceItem } from "@/types/service";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

const FormSchema = BookingInputSchema.pick({
  customerName: true,
  mobile: true,
  serviceId: true,
  serviceAreaId: true,
  town: true,
  pincode: true,
  streetAddress: true,
  date: true,
  time: true,
}).extend({
  applianceCategory: z.enum(APPLIANCE_CATEGORIES),
  applianceSubType: z.string().min(1, "Choose a type"),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}

function subTypesFor(services: ServiceItem[], category: ApplianceCategoryValue): string[] {
  const present = new Set(services.filter((s) => s.applianceCategory === category).map((s) => s.applianceSubType));
  return SUB_TYPES[category].filter((t) => present.has(t));
}

function optionsFor(services: ServiceItem[], category: ApplianceCategoryValue, subType: string): ServiceItem[] {
  return services.filter((s) => s.applianceCategory === category && s.applianceSubType === subType);
}

export default function BookingForm({
  services,
  areas,
  defaultCategory,
  defaultAreaId,
}: {
  services: ServiceItem[];
  areas: ServiceAreaItem[];
  defaultCategory?: ApplianceCategoryValue;
  defaultAreaId?: string;
}) {
  const categories = useMemo(
    () => APPLIANCE_CATEGORIES.filter((c) => services.some((s) => s.applianceCategory === c)),
    [services]
  );

  const initial = useMemo(() => {
    const category = defaultCategory && categories.includes(defaultCategory) ? defaultCategory : categories[0] ?? "AC";
    const subType = subTypesFor(services, category)[0] ?? "";
    const serviceId = optionsFor(services, category, subType)[0]?.id ?? "";
    return { category, subType, serviceId };
  }, [services, categories, defaultCategory]);

  const today = istDateString();
  const maxDate = addDaysToDateString(today, MAX_BOOKING_DAYS_AHEAD);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      applianceCategory: initial.category,
      applianceSubType: initial.subType,
      serviceId: initial.serviceId,
      customerName: "",
      mobile: "",
      date: addDaysToDateString(today, 1),
      time: "10:00 AM",
      serviceAreaId: defaultAreaId ?? (areas.length === 1 ? areas[0].id : ""),
      town: "",
      pincode: "",
      streetAddress: "",
      website: "",
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const category = watch("applianceCategory");
  const subType = watch("applianceSubType");
  const serviceId = watch("serviceId");

  const subTypes = useMemo(() => subTypesFor(services, category), [services, category]);
  const options = useMemo(() => optionsFor(services, category, subType), [services, category, subType]);
  const selected = services.find((s) => s.id === serviceId);

  const [pending, setPending] = useState<FormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "ok" | "failed">("idle");
  const idempotencyKey = useRef(newKey());

  useEffect(() => {
    captureAttribution();
  }, []);

  const onCategoryChange = (value: ApplianceCategoryValue) => {
    const firstSub = subTypesFor(services, value)[0] ?? "";
    setValue("applianceSubType", firstSub);
    setValue("serviceId", optionsFor(services, value, firstSub)[0]?.id ?? "");
  };

  const onSubTypeChange = (value: string) => {
    setValue("serviceId", optionsFor(services, category, value)[0]?.id ?? "");
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("failed");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: Number(c.latitude.toFixed(6)), lng: Number(c.longitude.toFixed(6)) });
        setLocStatus("ok");
      },
      () => setLocStatus("failed"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirmBooking = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      const { applianceCategory, applianceSubType, website, ...rest } = pending;
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          website,
          ...(coords ?? {}),
          ...readAttribution(),
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setBookingRef(json.data.bookingRef);
        idempotencyKey.current = newKey();
        reset({ ...pending, customerName: "", mobile: "", streetAddress: "", town: "", pincode: "" });
        setCoords(null);
        setLocStatus("idle");
      } else {
        toast.error(json.message || "Could not book. Please try again.");
      }
    } catch {
      toast.error("Could not book. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
      setPending(null);
    }
  };

  const pendingService = services.find((s) => s.id === pending?.serviceId);
  const pendingArea = areas.find((a) => a.id === pending?.serviceAreaId);
  const bookingClosed = areas.length === 0 || services.length === 0;

  return (
    <section id="bookingForm" aria-labelledby="booking-heading">
      <div className="px-3 py-6 pt-20 text-white bg-blue-800">
        <h2 id="booking-heading" className="text-lg font-semibold sm:w-1/2 sm:m-auto">
          Fill out form to book service now
        </h2>

        {bookingClosed ? (
          <p className="sm:w-1/2 sm:m-auto mt-4 text-blue-100">Online booking is not open right now. Please call us to book.</p>
        ) : (
          <form onSubmit={handleSubmit((values) => setPending(values))} noValidate className="grid gap-3 sm:w-1/2 sm:m-auto mt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="bf-category" label="Appliance" error={errors.applianceCategory?.message}>
                <select
                  id="bf-category"
                  className={selectClass}
                  {...register("applianceCategory", { onChange: (e) => onCategoryChange(e.target.value) })}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="bf-subtype" label="Type" error={errors.applianceSubType?.message}>
                <select
                  id="bf-subtype"
                  className={selectClass}
                  {...register("applianceSubType", { onChange: (e) => onSubTypeChange(e.target.value) })}
                >
                  {subTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field id="bf-service" label="Service" error={errors.serviceId?.message}>
              <select id="bf-service" className={selectClass} {...register("serviceId")}>
                {options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serviceType} - ₹{s.price}
                  </option>
                ))}
              </select>
            </Field>

            {selected && (
              <p className="text-sm rounded-md bg-blue-900/60 px-3 py-2" aria-live="polite">
                Price: <strong>₹{selected.price}</strong>
                {selected.warrantyDurationDays > 0 && <> &middot; {selected.warrantyDurationDays}-day guarantee</>}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="bf-name" label="Full name" error={errors.customerName?.message}>
                <Input id="bf-name" autoComplete="name" className="text-primary" {...register("customerName")} />
              </Field>
              <Field id="bf-mobile" label="Mobile number" error={errors.mobile?.message}>
                <Input
                  id="bf-mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10 digit number"
                  className="text-primary"
                  {...register("mobile", { setValueAs: (v) => normalizeIndianMobile(String(v ?? "")) })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="bf-date" label="Date" error={errors.date?.message}>
                <Input id="bf-date" type="date" min={today} max={maxDate} className="text-primary" {...register("date")} />
              </Field>
              <Field id="bf-time" label="Time" error={errors.time?.message}>
                <select id="bf-time" className={selectClass} {...register("time")}>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="bf-district" label="District" error={errors.serviceAreaId?.message}>
                <select id="bf-district" className={selectClass} {...register("serviceAreaId")}>
                  <option value="">Select district</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.district}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="bf-town" label="Town / village" error={errors.town?.message}>
                <Input id="bf-town" autoComplete="address-level2" className="text-primary" {...register("town")} />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="bf-pincode" label="Pincode" error={errors.pincode?.message}>
                <Input
                  id="bf-pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  className="text-primary"
                  {...register("pincode")}
                />
              </Field>
              <Field id="bf-street" label="Street / nearby location" error={errors.streetAddress?.message}>
                <Input id="bf-street" autoComplete="street-address" className="text-primary" {...register("streetAddress")} />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-primary"
                onClick={useMyLocation}
                disabled={locStatus === "loading"}
              >
                <MdMyLocation className="mr-2 h-4 w-4" aria-hidden="true" />
                {locStatus === "loading" ? "Finding location..." : "Use my current location"}
              </Button>
              <span className="text-xs text-blue-100" aria-live="polite">
                {locStatus === "ok" && "Location added. Thank you."}
                {locStatus === "failed" && "Could not get your location. No problem, we will use your address."}
                {locStatus === "idle" && "Optional. Helps the technician find you."}
              </span>
            </div>

            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Leave this field empty
                <input tabIndex={-1} autoComplete="off" {...register("website")} />
              </label>
            </div>

            <div className="flex justify-center pt-4">
              <Button className="px-10" variant="secondary" type="submit">
                Review booking
              </Button>
            </div>
          </form>
        )}
      </div>

      <AlertDialog open={pending !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your booking</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground grid gap-1">
                <span>
                  {pendingService?.serviceType} ({pending?.applianceSubType}) - ₹{pendingService?.price}
                </span>
                <span>
                  {pending?.date} at {pending?.time}
                </span>
                <span>
                  {pending?.streetAddress}, {pending?.town}, {pendingArea?.district} {pending?.pincode}
                </span>
                <span>Mobile: {pending?.mobile}</span>
                <span className="pt-2">Please be available at this time.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPending(null)} disabled={submitting}>
              Edit details
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmBooking();
              }}
              disabled={submitting}
            >
              {submitting ? "Booking..." : "Confirm booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bookingRef !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex flex-col items-center justify-center">
                <MdCheckCircleOutline className="text-green-500 w-16 h-16" aria-hidden="true" />
                <span>Booking received</span>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center grid gap-2">
                <span>Your booking reference</span>
                <span className="text-2xl font-mono font-semibold text-foreground">{bookingRef}</span>
                <span>
                  Keep this reference. We will confirm your booking soon. You can check its status any time with your mobile number.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/track">Track booking</Link>
            </Button>
            <AlertDialogAction onClick={() => setBookingRef(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
