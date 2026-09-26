"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/custom/admin/ui";
import type { NotificationItem, NotificationList } from "@/lib/domain/notifications";

type Filter = "ALL" | "FAILED" | "SKIPPED" | "SENT";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "FAILED", label: "Failed" },
  { key: "SKIPPED", label: "Not sent" },
  { key: "SENT", label: "Sent" },
];

const STATUS_STYLE: Record<NotificationItem["status"], { label: string; className: string }> = {
  SENT: { label: "Sent", className: "bg-green-100 text-green-800" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
  SKIPPED: { label: "Not sent", className: "bg-amber-100 text-amber-800" },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationList | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), ...(filter === "ALL" ? {} : { status: filter }) });
    try {
      const res = await fetch(`/api/admin/notifications?${params}`);
      const json = await res.json();
      if (json.status === "success") setData(json.data);
      else toast.error(json.message || "Could not load messages");
    } catch {
      toast.error("Could not load messages");
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const resend = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}/resend`, { method: "POST" });
      const json = await res.json();
      if (json.status === "success") {
        (json.data.result === "SENT" ? toast.success : toast.error)(json.message);
        await load();
      } else {
        toast.error(json.message || "Could not resend");
      }
    } catch {
      toast.error("Could not resend");
    } finally {
      setBusyId(null);
    }
  };

  const pick = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-3">
      <PageTitle title="Messages" sub={<Link href="/admin/settings" className="text-blue-700 underline">Change the new-booking alert number in Settings</Link>} />

      {data && (
        <p
          role="status"
          className={`rounded-md border p-3 text-sm ${data.smsConfigured ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
        >
          {data.smsConfigured
            ? "SMS is switched on. Messages go out through MSG91."
            : "SMS is not set up yet. Every message below is recorded but not sent. Once the MSG91 key and template ids are added on the server, new messages will go out, and you can resend the ones listed here."}
        </p>
      )}

      <div role="tablist" aria-label="Message status" className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <Button key={key} role="tab" aria-selected={filter === key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => pick(key)}>
            {label}
            {data && <span className="ml-1.5 opacity-80">({key === "ALL" ? data.counts.all : data.counts[key]})</span>}
          </Button>
        ))}
      </div>

      {data === null ? (
        <p className="py-10 text-center text-muted-foreground">Loading...</p>
      ) : data.items.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No messages yet.</p>
      ) : (
        <ul className="grid gap-2">
          {data.items.map((m) => (
            <li key={m.id}>
              <Card>
                <CardContent className="grid gap-2 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[m.status].className}`}>{STATUS_STYLE[m.status].label}</span>
                      <span className="font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        to {m.recipient} {m.to}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{when(m.createdAt)}</span>
                  </div>
                  {m.body && <p className="rounded-md bg-muted/60 p-2 text-sm">{m.body}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {m.bookingRef && m.bookingId ? (
                        <Link href={`/admin/bookings/${m.bookingId}`} className="font-mono text-blue-700 hover:underline">
                          {m.bookingRef}
                        </Link>
                      ) : null}
                      {m.providerResponse ? ` ${m.providerResponse}` : ""}
                      {m.attempts > 1 ? ` (${m.attempts} tries)` : ""}
                    </span>
                    {m.status !== "SENT" && (
                      <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => resend(m.id)}>
                        {busyId === m.id ? "Sending..." : "Resend"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.pageCount} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
