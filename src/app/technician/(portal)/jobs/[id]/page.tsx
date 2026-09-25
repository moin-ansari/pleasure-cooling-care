"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { MdArrowBack, MdCall, MdDirections } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import JobStatusBadge from "@/components/custom/technician/JobStatusBadge";
import { techFetch } from "@/components/custom/technician/techFetch";
import { clockTime, friendlyDay } from "@/components/custom/technician/techFormat";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { mapsLinkFor } from "@/lib/maps";
import type { JobDetail } from "@/lib/domain/technicianJobs";

type Mode = "eta" | "delay" | "complete" | null;

const ETA_CHOICES = [15, 30, 45, 60, 90];

export default function JobPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [eta, setEta] = useState(30);
  const [reason, setReason] = useState("");
  const [labor, setLabor] = useState("");
  const [parts, setParts] = useState("0");
  const [collected, setCollected] = useState("");
  const [collectedTouched, setCollectedTouched] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/technician/jobs/${params.id}`);
      if (res.status === 401) {
        await fetch("/api/technician/logout", { method: "POST" }).catch(() => undefined);
        window.location.href = "/technician/login";
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (json.status === "success") setJob(json.data);
      else toast.error(json.message || "Could not load the job");
    } catch {
      toast.error("Could not load the job");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (mode === "complete" && job) {
      setLabor(String(job.price));
      setParts("0");
      setCollected(String(job.price));
      setCollectedTouched(false);
    }
  }, [mode, job]);

  const send = async (body: object, success: string) => {
    setBusy(true);
    setError("");
    try {
      const json = await techFetch(`/api/technician/jobs/${params.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (json.status === "success") {
        setJob(json.data);
        setMode(null);
        setReason("");
        toast.success(success);
      } else {
        setError(json.message || "Could not update the job");
      }
    } catch {
      // session errors are handled in techFetch
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-muted-foreground">This job was not found.</p>
        <Button asChild variant="outline">
          <Link href="/technician">Back to jobs</Link>
        </Button>
      </div>
    );
  }
  if (!job) return <p className="py-10 text-center text-muted-foreground">Loading...</p>;

  const can = (status: string) => job.nextStatuses.includes(status as never);
  const directions = mapsLinkFor(job);
  const setLaborAmount = (value: string) => {
    setLabor(value);
    if (!collectedTouched) setCollected(String(Number(value || 0) + Number(parts || 0)));
  };
  const setPartsAmount = (value: string) => {
    setParts(value);
    if (!collectedTouched) setCollected(String(Number(labor || 0) + Number(value || 0)));
  };

  return (
    <div className="grid gap-4">
      <Link href="/technician" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-blue-700">
        <MdArrowBack className="h-5 w-5" aria-hidden="true" /> Jobs
      </Link>

      <section className="rounded-lg border bg-background p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <JobStatusBadge status={job.status} />
          <span className="font-mono text-xs text-muted-foreground">{job.bookingRef}</span>
        </div>
        <h1 className="text-xl font-bold">
          {friendlyDay(job.date)}, {job.time}
        </h1>
        <p className="font-medium">{job.serviceType}</p>
        <p className="text-sm text-muted-foreground">
          {CATEGORY_LABELS[job.applianceCategory]} ({job.applianceSubType})
        </p>
        {job.isWarrantyRedo && <p className="mt-2 text-sm font-medium text-purple-700">Free re-service under guarantee</p>}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Quoted price</dt>
          <dd>₹{job.price}</dd>
          {job.confirmedArrivalAt && (
            <>
              <dt className="text-muted-foreground">Arrival time set</dt>
              <dd>
                {friendlyDay(new Date(job.confirmedArrivalAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }))}, {clockTime(job.confirmedArrivalAt)}
              </dd>
            </>
          )}
          {job.etaAt && job.status === "ARRIVING" && (
            <>
              <dt className="text-muted-foreground">Your ETA</dt>
              <dd>{clockTime(job.etaAt)}</dd>
            </>
          )}
          {job.technicianNotes && job.status === "DELAYED" && (
            <>
              <dt className="text-muted-foreground">Delay reason</dt>
              <dd>{job.technicianNotes}</dd>
            </>
          )}
          {job.status === "COMPLETED" && (
            <>
              <dt className="text-muted-foreground">Service charge</dt>
              <dd>₹{job.laborAmount}</dd>
              <dt className="text-muted-foreground">Parts</dt>
              <dd>₹{job.partsAmount}</dd>
              <dt className="text-muted-foreground">Collected</dt>
              <dd>₹{job.amountCollected ?? 0}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-lg border bg-background p-4 shadow-sm">
        <h2 className="mb-1 font-semibold">Customer</h2>
        <p>{job.customerName}</p>
        {job.mobile ? (
          <>
            <p className="text-sm text-muted-foreground">
              {job.streetAddress}, {job.town}, {job.district} {job.pincode}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-12">
                <a href={`tel:+91${job.mobile}`}>
                  <MdCall className="mr-2 h-5 w-5" aria-hidden="true" /> Call
                </a>
              </Button>
              {directions ? (
                <Button asChild variant="outline" className="h-12">
                  <a href={directions} target="_blank" rel="noopener noreferrer">
                    <MdDirections className="mr-2 h-5 w-5" aria-hidden="true" /> Directions
                  </a>
                </Button>
              ) : (
                <span />
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {job.town}, {job.district}
          </p>
        )}
      </section>

      {job.nextStatuses.length > 0 && (
        <section className="rounded-lg border bg-background p-4 shadow-sm" aria-label="Update this job">
          {mode === null && (
            <div className="grid gap-3">
              {can("ARRIVING") && (
                <Button className="h-12 text-base" onClick={() => setMode("eta")}>
                  I&apos;m on my way
                </Button>
              )}
              {can("WORKING") && (
                <Button className="h-12 text-base" disabled={busy} onClick={() => send({ status: "WORKING" }, "Work started")}>
                  {job.status === "DELAYED" ? "Resume work" : "Start work"}
                </Button>
              )}
              {can("COMPLETED") && (
                <Button className="h-12 bg-green-600 text-base hover:bg-green-700" onClick={() => setMode("complete")}>
                  Complete job
                </Button>
              )}
              {can("DELAYED") && (
                <Button variant="outline" className="h-12 text-base" onClick={() => setMode("delay")}>
                  Job is taking longer
                </Button>
              )}
            </div>
          )}

          {mode === "eta" && (
            <div className="grid gap-3">
              <h2 className="font-semibold">When will you reach?</h2>
              <div className="flex flex-wrap gap-2">
                {ETA_CHOICES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={eta === m}
                    onClick={() => setEta(m)}
                    className={`min-h-[44px] rounded-md border px-4 text-sm font-medium ${eta === m ? "border-blue-800 bg-blue-800 text-white" : ""}`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12" onClick={() => setMode(null)} disabled={busy}>
                  Back
                </Button>
                <Button className="h-12" disabled={busy} onClick={() => send({ status: "ARRIVING", etaMinutes: eta }, "Marked as on the way")}>
                  {busy ? "Saving..." : "Confirm"}
                </Button>
              </div>
            </div>
          )}

          {mode === "delay" && (
            <div className="grid gap-3">
              <h2 className="font-semibold">Why is it taking longer?</h2>
              <label htmlFor="delay-reason" className="sr-only">
                Reason
              </label>
              <textarea
                id="delay-reason"
                className="min-h-[96px] w-full rounded-md border border-input bg-background p-3 text-base"
                placeholder="For example: waiting for a spare part"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12" onClick={() => setMode(null)} disabled={busy}>
                  Back
                </Button>
                <Button className="h-12" disabled={busy} onClick={() => send({ status: "DELAYED", reason }, "Marked as pending")}>
                  {busy ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}

          {mode === "complete" && (
            <div className="grid gap-3">
              <h2 className="font-semibold">Complete this job</h2>
              <div className="grid gap-1.5">
                <label htmlFor="c-labor" className="text-sm font-medium">
                  Service charge (₹)
                </label>
                <Input id="c-labor" type="number" inputMode="numeric" min={0} className="h-12 text-base" value={labor} onFocus={(e) => e.target.select()} onChange={(e) => setLaborAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="c-parts" className="text-sm font-medium">
                  Parts amount (₹)
                </label>
                <Input id="c-parts" type="number" inputMode="numeric" min={0} className="h-12 text-base" value={parts} onFocus={(e) => e.target.select()} onChange={(e) => setPartsAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="c-collected" className="text-sm font-medium">
                  Cash collected from customer (₹)
                </label>
                <Input
                  id="c-collected"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="h-12 text-base"
                  value={collected}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setCollectedTouched(true);
                    setCollected(e.target.value);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12" onClick={() => setMode(null)} disabled={busy}>
                  Back
                </Button>
                <Button
                  className="h-12 bg-green-600 hover:bg-green-700"
                  disabled={busy}
                  onClick={() =>
                    send(
                      { status: "COMPLETED", laborAmount: Number(labor), partsAmount: Number(parts), amountCollected: Number(collected) },
                      "Job completed"
                    )
                  }
                >
                  {busy ? "Saving..." : "Complete"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
