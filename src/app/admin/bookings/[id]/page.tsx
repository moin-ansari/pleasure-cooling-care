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
import { ADMIN_STATUS_LABELS, TIME_SLOTS } from "@/constants/booking";
import { istDateString } from "@/lib/time";
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

const CANCEL_REASONS = ["Customer asked to cancel", "Customer not reachable", "No technician available", "Duplicate booking", "Outside our area"];
const PRICE_REASONS = ["Extra work found", "Discount given", "Wrong price shown", "Parts needed"];

function Chips({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((r) => (
        <button key={r} type="button" onClick={() => onPick(r)} className="rounded-full border bg-slate-50 px-2.5 py-1 text-xs text-slate-700 active:bg-slate-100">
          {r}
        </button>
      ))}
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

  const [fixOpen, setFixOpen] = useState(false);
  const [fix, setFix] = useState({ labor: "", parts: "", collected: "", note: "" });
  const [fixBusy, setFixBusy] = useState(false);
  const [fixError, setFixError] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ customerName: "", streetAddress: "", town: "", pincode: "", date: "", time: "" });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

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

  const saveFix = async () => {
    setFixBusy(true);
    setFixError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/amounts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laborAmount: Number(fix.labor), partsAmount: Number(fix.parts), amountCollected: Number(fix.collected), note: fix.note }),
      });
      const json = await res.json();
      if (json.status === "success") {
        const change = json.data.commissionChange as number;
        toast.success(change === 0 ? "Amounts corrected" : `Amounts corrected. Commission changed by ${change > 0 ? "+" : "-"}₹${Math.abs(change)}`);
        setBooking(json.data.booking);
        setFixOpen(false);
      } else {
        setFixError(json.message || "Could not correct the amounts");
      }
    } catch {
      setFixError("Could not correct the amounts");
    } finally {
      setFixBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!booking) return;
    setEditBusy(true);
    setEditError("");
    try {
      const body: Record<string, string> = { customerName: edit.customerName, streetAddress: edit.streetAddress, town: edit.town, pincode: edit.pincode };
      if (booking.canMoveVisit) {
        body.date = edit.date;
        body.time = edit.time;
      }
      const res = await fetch(`/api/admin/bookings/${booking.id}/edit`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        setBooking(json.data);
        setEditOpen(false);
      } else setEditError(json.message || "Could not save");
    } catch {
      setEditError("Could not save. Please try again.");
    } finally {
      setEditBusy(false);
    }
  };

  const addNote = async () => {
    if (!booking) return;
    setNoteBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/note`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      const json = await res.json();
      if (json.status === "success") {
        setBooking(json.data);
        setNote("");
        toast.success("Note added");
      } else toast.error(json.message || "Could not add the note");
    } catch {
      toast.error("Could not add the note");
    } finally {
      setNoteBusy(false);
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
    <div className="grid gap-3">
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

      {booking.reassignReason && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">{booking.technician?.name ?? "The technician"} cannot attend this job</p>
          <p>{booking.reassignReason}</p>
          <p className="mt-1 text-xs">Choose someone else below. Until you do, the job stays with them.</p>
        </div>
      )}

      {booking.status === "CANCELLED" && booking.cancelReason && (
        <p className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm">Cancelled: {booking.cancelReason}</p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="grid content-start gap-3 lg:col-span-2">
          <Card>
            <CardContent className="grid gap-3 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{booking.serviceType}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[booking.applianceCategory]}, {booking.applianceSubType}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {editingPrice ? null : (
                    <>
                      <p className="text-lg font-bold">₹{booking.price}</p>
                      {booking.canEditPrice && (
                        <button
                          type="button"
                          className="text-xs font-medium text-blue-700"
                          onClick={() => {
                            setPrice(String(booking.price));
                            setPriceNote("");
                            setPriceError("");
                            setEditingPrice(true);
                          }}
                        >
                          Change price
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editingPrice && (
                <div className="grid gap-2 rounded-lg border bg-slate-50 p-2.5">
                  <label htmlFor="price-input" className="text-xs font-medium">
                    New price
                  </label>
                  <Input id="price-input" type="number" inputMode="numeric" min={0} value={price} onFocus={(e) => e.target.select()} onChange={(e) => setPrice(e.target.value)} />
                  <label htmlFor="price-note" className="text-xs font-medium">
                    Reason (optional)
                  </label>
                  <Input id="price-note" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} />
                  <Chips items={PRICE_REASONS} onPick={setPriceNote} />
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
              )}

              <dl className="divide-y rounded-lg border px-2.5">
                <Row label="Visit">
                  {friendlyDay(booking.date)}, {booking.time}
                </Row>
                {booking.confirmedArrivalAt && <Row label="Arrival set">{dt(booking.confirmedArrivalAt)}</Row>}
                {booking.etaAt && booking.status === "ARRIVING" && <Row label="Technician ETA">{dt(booking.etaAt)}</Row>}
                {booking.technicianNotes && booking.status === "DELAYED" && <Row label="Delay reason">{booking.technicianNotes}</Row>}
                {booking.warrantyRedoOfRef && <Row label="Free re-service of">{booking.warrantyRedoOfRef}</Row>}
                {booking.status === "COMPLETED" && (
                  <>
                    <Row label="Service charge">₹{booking.laborAmount}</Row>
                    <Row label="Parts">₹{booking.partsAmount}</Row>
                    <Row label="Cash collected">₹{booking.amountCollected ?? 0}</Row>
                    <Row label="Your commission">{booking.commission !== null ? `₹${booking.commission}` : "None"}</Row>
                    <Row label="Completed">{booking.completedAt ? dt(booking.completedAt) : "-"}</Row>
                    {booking.warrantyExpiresAt && <Row label="Guarantee until">{dt(booking.warrantyExpiresAt)}</Row>}
                  </>
                )}
              </dl>

              {booking.status === "COMPLETED" && (
                <div>
                  {fixOpen ? (
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            ["labor", "Service charge"],
                            ["parts", "Parts"],
                            ["collected", "Cash collected"],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key} className="grid gap-1">
                            <label htmlFor={`fix-${key}`} className="text-xs font-medium">
                              {label}
                            </label>
                            <Input id={`fix-${key}`} type="number" inputMode="numeric" min={0} value={fix[key]} onChange={(e) => setFix({ ...fix, [key]: e.target.value })} />
                          </div>
                        ))}
                      </div>
                      <label htmlFor="fix-note" className="sr-only">
                        Reason
                      </label>
                      <Input id="fix-note" placeholder="Why are you correcting this?" value={fix.note} onChange={(e) => setFix({ ...fix, note: e.target.value })} />
                      {fixError && (
                        <p role="alert" className="text-sm text-red-600">
                          {fixError}
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setFixOpen(false)} disabled={fixBusy}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveFix} disabled={fixBusy}>
                          {fixBusy ? "Saving..." : "Save corrections"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFix({ labor: String(booking.laborAmount), parts: String(booking.partsAmount), collected: String(booking.amountCollected ?? 0), note: "" });
                        setFixError("");
                        setFixOpen(true);
                      }}
                    >
                      Correct amounts
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-3 pb-1">
              <CardTitle className="text-base">Customer</CardTitle>
              {booking.canEdit && !editOpen && (
                <button
                  type="button"
                  className="text-xs font-medium text-blue-700"
                  onClick={() => {
                    setEdit({ customerName: booking.customerName, streetAddress: booking.streetAddress, town: booking.town, pincode: booking.pincode, date: booking.date, time: booking.time });
                    setEditError("");
                    setEditOpen(true);
                  }}
                >
                  Edit
                </button>
              )}
            </CardHeader>
            <CardContent className="grid gap-3 px-3 pb-3">
              {editOpen ? (
                <div className="grid gap-2">
                  {(
                    [
                      ["customerName", "Name"],
                      ["streetAddress", "Address"],
                      ["town", "Town or locality"],
                      ["pincode", "Pincode"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="grid gap-1">
                      <label htmlFor={`edit-${key}`} className="text-xs font-medium">
                        {label}
                      </label>
                      <Input id={`edit-${key}`} value={edit[key]} inputMode={key === "pincode" ? "numeric" : undefined} maxLength={key === "pincode" ? 6 : 200} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
                    </div>
                  ))}
                  {booking.canMoveVisit && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <label htmlFor="edit-date" className="text-xs font-medium">
                          Visit date
                        </label>
                        <Input id="edit-date" type="date" min={istDateString()} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                      </div>
                      <div className="grid gap-1">
                        <label htmlFor="edit-time" className="text-xs font-medium">
                          Time
                        </label>
                        <select id="edit-time" className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })}>
                          {TIME_SLOTS.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {editError && (
                    <p role="alert" className="text-sm text-red-600">
                      {editError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditOpen(false)} disabled={editBusy}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit} disabled={editBusy}>
                      {editBusy ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium">
                      <Link href={`/admin/customers/${booking.mobile}`} className="text-blue-800 underline-offset-2 hover:underline">
                        {booking.customerName}
                      </Link>
                    </p>
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
                    {maps && (
                      <Button asChild size="sm">
                        <a href={maps} target="_blank" rel="noopener noreferrer">
                          <MdDirections className="mr-1.5 h-4 w-4" aria-hidden="true" /> Maps
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <p className="text-muted-foreground">{fullAddress}</p>
                    <CopyButton className="shrink-0" textToCopy={fullAddress} />
                  </div>
                  {maps && <p className="text-xs text-muted-foreground">{booking.lat !== null ? "Exact location shared by the customer" : "Map is based on the typed address"}</p>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-base">Notes and history</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-3 pb-3">
              <div className="grid gap-1.5">
                <label htmlFor="note-input" className="text-xs font-medium">
                  Private note for the team
                </label>
                <div className="flex gap-2">
                  <Input id="note-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="For example: call before going" />
                  <Button size="sm" className="h-10" onClick={addNote} disabled={noteBusy || note.trim().length < 2}>
                    Add
                  </Button>
                </div>
              </div>
              <details open={booking.history.length <= 4}>
                <summary className="cursor-pointer text-sm font-medium text-slate-700">History ({booking.history.length})</summary>
                <ol className="mt-2 grid gap-3">
                  {[...booking.history].reverse().map((h) => (
                    <li key={h.id} className="border-l-2 border-blue-200 pl-3 text-sm">
                      <p className="font-medium">
                        {h.fromStatus && h.fromStatus !== h.toStatus ? `${ADMIN_STATUS_LABELS[h.fromStatus]} to ${ADMIN_STATUS_LABELS[h.toStatus]}` : ADMIN_STATUS_LABELS[h.toStatus]}
                      </p>
                      {h.note && <p className="break-words text-muted-foreground">{h.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {h.actor} &middot; {dt(h.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-3">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-base">Technician</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-3 pb-3">
              {booking.technician ? (
                <div className="text-sm">
                  <p className="font-medium">
                    <Link href={`/admin/technicians/${booking.technician.id}`} className="text-blue-800 hover:underline">
                      {booking.technician.name}
                    </Link>
                  </p>
                  <a className="text-blue-700" href={`tel:+91${booking.technician.phone}`}>
                    {booking.technician.phone}
                  </a>
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
            <Chips items={CANCEL_REASONS} onPick={setReason} />
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
