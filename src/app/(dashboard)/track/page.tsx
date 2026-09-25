"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { MdCancel, MdCheckCircle, MdLocalShipping, MdBuild, MdWarningAmber, MdMarkEmailRead } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { CATEGORY_LABELS } from "@/constants/appliances";
import { STATUS_LABELS, type BookingStatusValue } from "@/constants/booking";
import { BUSINESS } from "@/constants/business";
import { normalizeIndianMobile, isValidIndianMobile } from "@/lib/phone";
import type { TrackedBooking } from "@/lib/domain/bookings";

const STATUS_STYLE: Record<BookingStatusValue, { icon: React.ElementType; className: string }> = {
  NEW: { icon: MdMarkEmailRead, className: "bg-blue-100 text-blue-800" },
  CONFIRMED: { icon: MdCheckCircle, className: "bg-green-100 text-green-800" },
  ARRIVING: { icon: MdLocalShipping, className: "bg-amber-100 text-amber-800" },
  WORKING: { icon: MdBuild, className: "bg-amber-100 text-amber-800" },
  DELAYED: { icon: MdWarningAmber, className: "bg-orange-100 text-orange-800" },
  COMPLETED: { icon: MdCheckCircle, className: "bg-green-100 text-green-800" },
  CANCELLED: { icon: MdCancel, className: "bg-gray-200 text-gray-700" },
};

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function TrackPage() {
  const [mobile, setMobile] = useState("");
  const [bookings, setBookings] = useState<TrackedBooking[] | null>(null);
  const [searchedMobile, setSearchedMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toCancel, setToCancel] = useState<TrackedBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const lookup = async (number: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: number }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setBookings(json.data);
        setSearchedMobile(number);
      } else {
        setBookings(null);
        setError(json.message || "Could not find your bookings");
      }
    } catch {
      setBookings(null);
      setError("Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeIndianMobile(mobile);
    if (!isValidIndianMobile(normalized)) {
      setError("Enter the 10 digit mobile number you booked with");
      setBookings(null);
      return;
    }
    lookup(normalized);
  };

  const cancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef: toCancel.bookingRef, mobile: searchedMobile }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success("Booking cancelled");
        await lookup(searchedMobile);
      } else {
        toast.error(json.message || "Could not cancel");
      }
    } catch {
      toast.error("Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
      setToCancel(null);
    }
  };

  return (
    <main className="px-3 py-8 sm:w-1/2 sm:m-auto min-h-[70vh]">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Track your booking</h1>
      <p className="text-sm text-muted-foreground mb-5">Enter the mobile number you used while booking.</p>

      <form onSubmit={onSubmit} noValidate className="flex gap-2 mb-6">
        <div className="flex-1">
          <label htmlFor="track-mobile" className="sr-only">
            Mobile number
          </label>
          <Input
            id="track-mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10 digit mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "track-error" : undefined}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Checking..." : "Track"}
        </Button>
      </form>

      {error && (
        <p id="track-error" role="alert" className="text-sm text-red-600 mb-4">
          {error}
        </p>
      )}

      {bookings !== null && bookings.length === 0 && (
        <p className="text-muted-foreground">
          No bookings found for this number. If you just booked, please check the number or call us on{" "}
          <a className="underline" href={`tel:+91${BUSINESS.phone}`}>
            {BUSINESS.phone}
          </a>
          .
        </p>
      )}

      <div className="flex flex-col gap-4">
        {bookings?.map((b) => {
          const style = STATUS_STYLE[b.status];
          const Icon = style.icon;
          return (
            <Card key={b.bookingRef}>
              <CardContent className="p-4 grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{b.bookingRef}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.className}`}>
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {STATUS_LABELS[b.status]}
                  </span>
                </div>
                <div className="font-semibold">
                  {b.serviceType} <span className="text-sm font-normal text-muted-foreground">({CATEGORY_LABELS[b.applianceCategory]}, {b.applianceSubType})</span>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Requested for</dt>
                  <dd>
                    {formatDate(b.date)}, {b.time}
                  </dd>
                  {b.confirmedArrivalAt && (
                    <>
                      <dt className="text-muted-foreground">Arriving</dt>
                      <dd>{formatDateTime(b.confirmedArrivalAt)}</dd>
                    </>
                  )}
                  {b.technicianFirstName && (
                    <>
                      <dt className="text-muted-foreground">Technician</dt>
                      <dd>{b.technicianFirstName}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Area</dt>
                  <dd>{b.district}</dd>
                  <dt className="text-muted-foreground">Price</dt>
                  <dd>₹{b.price}</dd>
                </dl>
                {b.canCancel && (
                  <div className="pt-1">
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => setToCancel(b)}>
                      Cancel booking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={toCancel !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {toCancel?.serviceType} on {toCancel && formatDate(toCancel.date)}, {toCancel?.time}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToCancel(null)} disabled={cancelling}>
              Keep booking
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                cancel();
              }}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
