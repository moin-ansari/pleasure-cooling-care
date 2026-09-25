"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { MdArrowBack, MdCall, MdDirections, MdWhatsapp } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import AdminStatusBadge from "@/components/custom/admin/AdminStatusBadge";
import AssignPanel from "@/components/custom/admin/AssignPanel";
import CopyButton from "@/components/custom/copy";
import Loading from "@/components/custom/loading";
import { friendlyDay } from "@/components/custom/technician/techFormat";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { ADMIN_STATUS_LABELS } from "@/constants/booking";
import { mapsLinkFor } from "@/lib/maps";
import type { AdminBookingDetail } from "@/lib/domain/adminBookings";

const dt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default function BookingPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<AdminBookingDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [editingPrice, setEditingPrice] = useState(false);
  const [price, setPrice] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [priceBusy, setPriceBusy] = useState(false);
  const [priceError, setPriceError] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bookings/${params.id}`);
      if (res.status === 404) return setNotFound(true);
      const json = await res.json();
      if (json.status === "success") setBooking(json.data);
      else toast.error(json.message || "Could not load the booking");
    } catch {
      toast.error("Could not load the booking");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4 text-muted-foreground">This booking was not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <Loading label="Please Wait..." />
      </div>
    );
  }

  const maps = mapsLinkFor(booking);
  const fullAddress = `${booking.streetAddress}, ${booking.town}, ${booking.district} ${booking.pincode}`;

  const savePrice = async () => {
    setPriceBusy(true);
    setPriceError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/price`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(price), note: priceNote }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        setBooking(json.data);
        setEditingPrice(false);
      } else {
        setPriceError(json.message || "Could not update the price");
      }
    } catch {
      setPriceError("Could not update the price");
    } finally {
      setPriceBusy(false);
    }
  };

  const cancel = async () => {
    setCancelBusy(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        setBooking(json.data);
        setCancelOpen(false);
        setReason("");
      } else {
        setCancelError(json.message || "Could not cancel");
      }
    } catch {
      setCancelError("Could not cancel. Please try again.");
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="p-3 max-w-6xl mx-auto grid gap-4">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-blue-700">
        <MdArrowBack className="h-5 w-5" aria-hidden="true" /> Bookings
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-semibold">{booking.bookingRef}</h1>
        <AdminStatusBadge status={booking.status} />
        <span className="text-sm text-muted-foreground">
          Received {dt(booking.createdAt)} via {booking.source.toLowerCase()}
          {booking.utmCampaign ? `, campaign ${booking.utmCampaign}` : booking.utmSource ? `, from ${booking.utmSource}` : ""}
        </span>
      </div>

      {booking.status === "CANCELLED" && booking.cancelReason && (
        <p className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm">Cancelled: {booking.cancelReason}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2 content-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-6 pb-6">
              <div>
                <p className="font-medium">{booking.customerName}</p>
                <p className="text-sm text-muted-foreground">{booking.mobile}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:+91${booking.mobile}`}>
                    <MdCall className="mr-1.5 h-4 w-4" aria-hidden="true" /> Call
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`https://wa.me/91${booking.mobile}`} target="_blank" rel="noopener noreferrer">
                    <MdWhatsapp className="mr-1.5 h-4 w-4" aria-hidden="true" /> WhatsApp
                  </a>
                </Button>
              </div>
              <div className="flex items-start justify-between gap-3 text-sm">
                <p className="text-muted-foreground">{fullAddress}</p>
                <CopyButton className="shrink-0" textToCopy={fullAddress} />
              </div>
              {maps && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="sm">
                    <a href={maps} target="_blank" rel="noopener noreferrer">
                      <MdDirections className="mr-1.5 h-4 w-4" aria-hidden="true" /> Open in Google Maps
                    </a>
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {booking.lat !== null ? "Exact location shared by the customer" : "Based on the typed address"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service and price</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <dl>
                <Row label="Service">
                  {booking.serviceType}
                  <div className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[booking.applianceCategory]}, {booking.applianceSubType}
                  </div>
                </Row>
                <Row label="Requested for">
                  {friendlyDay(booking.date)}, {booking.time}
                </Row>
                <Row label="Price">
                  {editingPrice ? (
                    <div className="grid gap-2 text-left">
                      <label htmlFor="price-input" className="sr-only">
                        New price
                      </label>
                      <Input id="price-input" type="number" inputMode="numeric" min={0} value={price} onFocus={(e) => e.target.select()} onChange={(e) => setPrice(e.target.value)} />
                      <label htmlFor="price-note" className="sr-only">
                        Reason for the change
                      </label>
                      <Input id="price-note" placeholder="Reason (optional)" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} />
                      {priceError && (
                        <p role="alert" className="text-xs text-red-600">
                          {priceError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingPrice(false)} disabled={priceBusy}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={savePrice} disabled={priceBusy}>
                          {priceBusy ? "Saving..." : "Save price"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-3">
                      <strong>₹{booking.price}</strong>
                      {booking.canEditPrice && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPrice(String(booking.price));
                            setPriceNote("");
                            setPriceError("");
                            setEditingPrice(true);
                          }}
                        >
                          Change
                        </Button>
                      )}
                    </span>
                  )}
                </Row>
                {booking.status === "COMPLETED" && (
                  <>
                    <Row label="Service charge">₹{booking.laborAmount}</Row>
                    <Row label="Parts">₹{booking.partsAmount}</Row>
                    <Row label="Cash collected">₹{booking.amountCollected ?? 0}</Row>
                    <Row label="Completed">{booking.completedAt ? dt(booking.completedAt) : "-"}</Row>
                    {booking.warrantyExpiresAt && <Row label="Guarantee until">{dt(booking.warrantyExpiresAt)}</Row>}
                  </>
                )}
                {booking.warrantyRedoOfRef && <Row label="Free re-service of">{booking.warrantyRedoOfRef}</Row>}
                {booking.technicianNotes && booking.status === "DELAYED" && <Row label="Delay reason">{booking.technicianNotes}</Row>}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <ol className="grid gap-3">
                {[...booking.history].reverse().map((h) => (
                  <li key={h.id} className="border-l-2 border-blue-200 pl-3 text-sm">
                    <p className="font-medium">
                      {h.fromStatus && h.fromStatus !== h.toStatus ? `${ADMIN_STATUS_LABELS[h.fromStatus]} to ${ADMIN_STATUS_LABELS[h.toStatus]}` : ADMIN_STATUS_LABELS[h.toStatus]}
                    </p>
                    {h.note && <p className="text-muted-foreground">{h.note}</p>}
                    <p className="text-xs text-muted-foreground">
                      {h.actor} &middot; {dt(h.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 content-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technician</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-6 pb-6">
              {booking.technician ? (
                <div className="text-sm">
                  <p className="font-medium">{booking.technician.name}</p>
                  <a className="text-blue-700" href={`tel:+91${booking.technician.phone}`}>
                    {booking.technician.phone}
                  </a>
                  {booking.confirmedArrivalAt && <p className="text-muted-foreground mt-1">Arrival set for {dt(booking.confirmedArrivalAt)}</p>}
                  {booking.etaAt && booking.status === "ARRIVING" && <p className="text-muted-foreground">Technician ETA {dt(booking.etaAt)}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No technician assigned yet.</p>
              )}
              {booking.canAssign ? <AssignPanel key={booking.id + booking.status + (booking.technician?.id ?? "")} booking={booking} onChanged={setBooking} /> : null}
            </CardContent>
          </Card>

          {booking.canCancel && (
            <Button variant="outline" className="text-red-600" onClick={() => setCancelOpen(true)}>
              Cancel this booking
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={cancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking {booking.bookingRef}?</AlertDialogTitle>
            <AlertDialogDescription>The reason is saved on the booking. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor="cancel-reason" className="text-sm font-medium">
              Reason
            </label>
            <textarea
              id="cancel-reason"
              className="min-h-[80px] w-full rounded-md border border-input bg-background p-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {cancelError && (
              <p role="alert" className="text-sm text-red-600">
                {cancelError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelOpen(false)} disabled={cancelBusy}>
              Keep booking
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                cancel();
              }}
              disabled={cancelBusy}
            >
              {cancelBusy ? "Cancelling..." : "Cancel booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
