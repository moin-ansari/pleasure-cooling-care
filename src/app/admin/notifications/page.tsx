"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Building2, CheckCircle2, Search, Smartphone, TriangleAlert, UserRound, Wrench, XCircle } from "lucide-react";
import { MdWhatsapp } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chips, EmptyState, ListSkeleton, PageTitle, Panel } from "@/components/custom/admin/ui";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import type { NotificationItem, NotificationList, TemplateInfo } from "@/lib/domain/notifications";

type Status = "ALL" | "FAILED" | "SKIPPED" | "SENT";
type Who = "ALL" | NotificationItem["recipient"];
type Tab = "log" | "templates";

const STATUS_STYLE: Record<NotificationItem["status"], { label: string; badge: string; edge: string; Icon: React.ElementType }> = {
  SENT: { label: "Sent", badge: "bg-emerald-100 text-emerald-800", edge: "border-l-emerald-500", Icon: CheckCircle2 },
  FAILED: { label: "Failed", badge: "bg-red-100 text-red-800", edge: "border-l-red-500", Icon: XCircle },
  SKIPPED: { label: "Not sent", badge: "bg-amber-100 text-amber-800", edge: "border-l-amber-500", Icon: TriangleAlert },
};

const WHO_ICON: Record<NotificationItem["recipient"], React.ElementType> = { customer: UserRound, technician: Wrench, admin: Building2 };

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function NotificationsPage() {
  const { me } = useAdmin();
  const [tab, setTab] = useState<Tab>("log");
  const [status, setStatus] = useState<Status>("ALL");
  const [who, setWho] = useState<Who>("ALL");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationList | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const seq = useRef(0);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const params = new URLSearchParams({ page: String(page) });
    if (status !== "ALL") params.set("status", status);
    if (who !== "ALL") params.set("recipient", who);
    if (q) params.set("q", q);
    try {
      const res = await fetch(`/api/admin/notifications?${params}`);
      const json = await res.json();
      if (mine !== seq.current) return;
      if (json.status === "success") setData(json.data);
      else toast.error(json.message || "Could not load messages");
    } catch {
      toast.error("Could not load messages");
    }
  }, [status, who, q, page]);

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
      } else toast.error(json.message || "Could not resend");
    } catch {
      toast.error("Could not resend");
    } finally {
      setBusyId(null);
    }
  };

  const resendAll = async () => {
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/notifications/resend-failed", { method: "POST" });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        await load();
      } else toast.error(json.message || "Could not resend");
    } catch {
      toast.error("Could not resend");
    } finally {
      setBulkBusy(false);
    }
  };

  const counts = data?.counts;
  const failed = counts?.FAILED ?? 0;

  return (
    <div className="mx-auto grid max-w-4xl gap-3">
      <PageTitle title="Messages" sub="Every SMS the app sends, and what happened to it" />

      {me?.isOwner && (
        <Chips
          label="Section"
          value={tab}
          onChange={setTab}
          options={[
            { key: "log", label: "Messages" },
            { key: "templates", label: "Templates" },
          ]}
        />
      )}

      {tab === "templates" && me?.isOwner ? (
        <Templates />
      ) : (
        <>
          {data && (
            <p
              role="status"
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${data.smsConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
            >
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {data.smsConfigured
                ? "SMS is switched on. Messages go out through MSG91."
                : "SMS is not set up yet, so messages are only recorded. Use the WhatsApp button on a message to send it by hand for now."}
            </p>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <label htmlFor="msg-search" className="sr-only">
              Search by phone number or booking reference
            </label>
            <Input id="msg-search" className="h-10 pl-9" placeholder="Phone number or booking ref" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <Chips
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { key: "ALL", label: "All", count: counts?.all },
              { key: "FAILED", label: "Failed", count: counts?.FAILED },
              { key: "SKIPPED", label: "Not sent", count: counts?.SKIPPED },
              { key: "SENT", label: "Sent", count: counts?.SENT },
            ]}
          />
          <Chips
            label="Sent to"
            value={who}
            onChange={(v) => {
              setWho(v);
              setPage(1);
            }}
            options={[
              { key: "ALL", label: "Everyone" },
              { key: "customer", label: "Customers" },
              { key: "technician", label: "Technicians" },
              { key: "admin", label: "Office" },
            ]}
          />

          {failed > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <span>
                {failed} {failed === 1 ? "message" : "messages"} failed
              </span>
              <Button size="sm" variant="outline" className="border-red-300" disabled={bulkBusy} onClick={resendAll}>
                {bulkBusy ? "Sending..." : "Resend all failed"}
              </Button>
            </div>
          )}

          {data === null ? (
            <ListSkeleton rows={4} />
          ) : data.items.length === 0 ? (
            <EmptyState title="No messages here" text={q || status !== "ALL" || who !== "ALL" ? "Try clearing a filter." : "Messages show up as soon as the app sends one."} />
          ) : (
            <ul className="grid gap-2">
              {data.items.map((m) => {
                const st = STATUS_STYLE[m.status];
                const WhoIcon = WHO_ICON[m.recipient];
                return (
                  <li key={m.id} className={`grid gap-1.5 rounded-xl border border-l-4 bg-white p-2.5 shadow-sm ${st.edge}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <WhoIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                        <span className="truncate text-sm font-semibold">{m.label}</span>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.badge}`}>
                        <st.Icon className="h-3 w-3" aria-hidden="true" /> {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.recipient} {m.to} &middot; {when(m.createdAt)}
                      {m.bookingRef && m.bookingId && (
                        <>
                          {" "}
                          &middot;{" "}
                          <Link href={`/admin/bookings/${m.bookingId}`} className="font-mono text-blue-700 hover:underline">
                            {m.bookingRef}
                          </Link>
                        </>
                      )}
                    </p>
                    {m.body && <p className="break-words rounded-md bg-slate-50 p-2 text-sm">{m.body}</p>}
                    {m.status !== "SENT" && m.providerResponse && (
                      <p className="break-words text-xs text-muted-foreground">
                        {m.providerResponse}
                        {m.attempts > 1 ? ` (${m.attempts} tries)` : ""}
                      </p>
                    )}
                    {m.status !== "SENT" && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => resend(m.id)}>
                          {busyId === m.id ? "Sending..." : "Resend"}
                        </Button>
                        {m.body && (
                          <Button asChild size="sm" variant="outline">
                            <a href={`https://wa.me/91${m.to}?text=${encodeURIComponent(m.body)}`} target="_blank" rel="noopener noreferrer">
                              <MdWhatsapp className="mr-1.5 h-4 w-4" aria-hidden="true" /> WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
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

          <p className="text-xs text-muted-foreground">
            The number that gets an alert for each new booking is set in{" "}
            <Link href="/admin/settings" className="text-blue-700 underline">
              Settings
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

function Templates() {
  const [data, setData] = useState<{ configured: boolean; items: TemplateInfo[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/notifications/templates")
      .then((r) => r.json())
      .then((json) => (json.status === "success" ? setData(json.data) : toast.error(json.message || "Could not load templates")))
      .catch(() => toast.error("Could not load templates"));
  }, []);

  if (!data) return <ListSkeleton rows={3} />;
  const ready = data.items.filter((t) => t.hasTemplateId).length;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="grid gap-3">
      <Panel>
        <p className="text-sm">
          <strong>
            {ready} of {data.items.length}
          </strong>{" "}
          messages have their MSG91 template id set. {data.configured ? "The MSG91 key is set." : "The MSG91 key is not set yet."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Register each text below with DLT and create it in MSG91 with the variables in the same order. Then put its template id in the server setting named under it.
        </p>
      </Panel>
      {data.items.map((t) => (
        <section key={t.key} className="grid gap-1.5 rounded-xl border bg-white p-2.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-muted-foreground">To {t.recipient === "admin" ? "the office" : `the ${t.recipient}`}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${t.hasTemplateId ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{t.hasTemplateId ? "Ready" : "Needs id"}</span>
          </div>
          <p className="break-words rounded-md bg-slate-50 p-2 text-sm">{t.text}</p>
          <p className="break-words text-xs text-muted-foreground">Variables in order: {t.vars.map((v, i) => `${i + 1} ${v}`).join(", ")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => copy(t.text)}>
              Copy text
            </Button>
            <code className="break-all text-[11px] text-muted-foreground">{t.envName}</code>
          </div>
        </section>
      ))}
    </div>
  );
}
