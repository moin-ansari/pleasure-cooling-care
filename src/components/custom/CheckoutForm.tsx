"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { MdCheckCircleOutline } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCart } from "@/components/custom/CartProvider";
import TurnstileWidget, { TURNSTILE_SITE_KEY } from "@/components/custom/TurnstileWidget";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { MAX_BOOKING_DAYS_AHEAD, MIN_LEAD_MINUTES, TIME_SLOTS } from "@/constants/booking";
import { normalizeIndianMobile } from "@/lib/phone";
import { addDaysToDateString, istDateString, istMinutesOfDay, slotToMinutes } from "@/lib/time";
import { readAttribution } from "@/lib/attribution";
import type { ServiceItem } from "@/types/service";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const FormSchema = z.object({
  customerName: z.string().trim().min(2, "Enter your name").max(80),
  mobile: z.string().min(1, "Enter your mobile number"),
  serviceAreaId: z.string().min(1, "Choose your district"),
  town: z.string().trim().min(2, "Enter your town or village").max(80),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6 digit pincode"),
  streetAddress: z.string().trim().min(5, "Enter your street or landmark").max(200),
  date: z.string().min(1),
  time: z.string().min(1),
  website: z.string().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CheckoutForm({ services, areas }: { services: ServiceItem[]; areas: ServiceAreaItem[] }) {
  const router = useRouter();
  const { lines, hydrated, clear } = useCart();
  const byId = new Map(services.map((s) => [s.id, s]));
  const resolvedLines = lines.map((l) => ({ line: l, service: byId.get(l.serviceId) })).filter((r) => r.service);
  const orderTotal = resolvedLines.reduce((n, { line, service }) => n + service!.price * line.qty, 0);

  const today = istDateString();
  const maxDate = addDaysToDateString(today, MAX_BOOKING_DAYS_AHEAD);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      customerName: "",
      mobile: "",
      serviceAreaId: areas.length === 1 ? areas[0].id : "",
      town: "",
      pincode: "",
      streetAddress: "",
      date: addDaysToDateString(today, 1),
      time: "10:00 AM",
      website: "",
    },
  });

  const chosenDate = watch("date");
  const chosenTime = watch("time");
  const slots = useMemo(() => (chosenDate === today ? TIME_SLOTS.filter((t) => slotToMinutes(t) >= istMinutesOfDay() + MIN_LEAD_MINUTES) : [...TIME_SLOTS]), [chosenDate, today]);
  useEffect(() => {
    if (slots.length && !slots.some((t) => t === chosenTime)) setValue("time", slots[0]);
  }, [slots, chosenTime, setValue]);

  const [pending, setPending] = useState<FormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedRefs, setConfirmedRefs] = useState<{ bookingRef: string; serviceType: string }[] | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const idempotencyKey = useRef(newKey());

  useEffect(() => {
    if (hydrated && lines.length === 0 && !confirmedRefs) router.replace("/cart");
  }, [hydrated, lines.length, confirmedRefs, router]);

  const submit = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      const { website, ...rest } = pending;
      const res = await fetch("/api/bookings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          website,
          items: lines.map((l) => ({ serviceId: l.serviceId, qty: l.qty })),
          ...readAttribution(),
          idempotencyKey: idempotencyKey.current,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setConfirmedRefs(json.data.bookings);
        clear();
        idempotencyKey.current = newKey();
      } else {
        toast.error(json.message || "Could not place the order. Please try again.");
      }
    } catch {
      toast.error("Could not place the order. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
      setPending(null);
    }
  };

  if (!hydrated || (lines.length === 0 && !confirmedRefs)) return null;

  return (
    <div className="px-3 pb-6 sm:px-6">
      {TURNSTILE_SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />}

      <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm">
        <p className="mb-1.5 text-sm font-semibold text-slate-900">Your order</p>
        <ul className="grid gap-1 text-sm text-slate-700">
          {resolvedLines.map(({ line, service }) => (
            <li key={line.serviceId} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {service!.serviceType} ({CATEGORY_LABELS[service!.applianceCategory]}) &times; {line.qty}
              </span>
              <span className="shrink-0 font-medium">₹{service!.price * line.qty}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold text-slate-900">
          <span>Total</span>
          <span>₹{orderTotal}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit((values) => setPending(values))} noValidate className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="co-name" label="Full name" error={errors.customerName?.message}>
            <Input id="co-name" autoComplete="name" {...register("customerName")} />
          </Field>
          <Field id="co-mobile" label="Mobile number" error={errors.mobile?.message}>
            <Input id="co-mobile" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10 digit number" {...register("mobile", { setValueAs: (v) => normalizeIndianMobile(String(v ?? "")) })} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="co-date" label="Date" error={errors.date?.message}>
            <Input id="co-date" type="date" min={today} max={maxDate} {...register("date")} />
          </Field>
          <Field id="co-time" label="Time" error={errors.time?.message}>
            <select id="co-time" className={selectClass} {...register("time")}>
              {slots.length === 0 && <option value="">No slots left today</option>}
              {slots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="co-district" label="District" error={errors.serviceAreaId?.message}>
            <select id="co-district" className={selectClass} {...register("serviceAreaId")}>
              <option value="">Select district</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.district}
                </option>
              ))}
            </select>
          </Field>
          <Field id="co-town" label="Town / village" error={errors.town?.message}>
            <Input id="co-town" autoComplete="address-level2" {...register("town")} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="co-pincode" label="Pincode" error={errors.pincode?.message}>
            <Input id="co-pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} {...register("pincode")} />
          </Field>
          <Field id="co-street" label="Street / nearby location" error={errors.streetAddress?.message}>
            <Input id="co-street" autoComplete="street-address" {...register("streetAddress")} />
          </Field>
        </div>

        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Leave this field empty
            <input tabIndex={-1} autoComplete="off" {...register("website")} />
          </label>
        </div>

        <Button type="submit" size="lg" className="mt-1">
          Review order
        </Button>
      </form>

      <AlertDialog open={pending !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your order</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-1 text-sm text-muted-foreground">
                <span>
                  {resolvedLines.length} {resolvedLines.length === 1 ? "item" : "items"}, ₹{orderTotal} total
                </span>
                <span>
                  {pending?.date} at {pending?.time}
                </span>
                <span>
                  {pending?.streetAddress}, {pending?.town} {pending?.pincode}
                </span>
                <span>Mobile: {pending?.mobile}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <TurnstileWidget onToken={setTurnstileToken} />
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={submitting}>
              Edit details
            </Button>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); submit(); }} disabled={submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}>
              {submitting ? "Placing order..." : "Confirm order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmedRefs !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex flex-col items-center justify-center">
                <MdCheckCircleOutline className="h-16 w-16 text-green-500" aria-hidden="true" />
                <span>Order received</span>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid gap-2 text-center">
                <span>Your booking {confirmedRefs && confirmedRefs.length > 1 ? "references" : "reference"}</span>
                <div className="grid gap-1">
                  {confirmedRefs?.map((b) => (
                    <span key={b.bookingRef} className="font-mono text-lg font-semibold text-foreground">
                      {b.bookingRef} <span className="text-xs font-normal text-muted-foreground">({b.serviceType})</span>
                    </span>
                  ))}
                </div>
                <span>Keep these references. We will confirm shortly, and you can track them anytime with your mobile number.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/track">Track order</Link>
            </Button>
            <Button asChild>
              <Link href="/home">Done</Link>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
