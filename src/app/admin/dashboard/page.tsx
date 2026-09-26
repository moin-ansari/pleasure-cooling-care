"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, IndianRupee, MessageSquareWarning, PauseCircle, ShieldCheck, TrendingUp, UserX, Users } from "lucide-react";
import BookingCard from "@/components/custom/admin/BookingCard";
import CitySwitcher from "@/components/custom/admin/CitySwitcher";
import { EmptyState, ListSkeleton, Panel, StatTile } from "@/components/custom/admin/ui";
import { UNASSIGNED_ALERT_MINUTES } from "@/constants/booking";
import { istDateString } from "@/lib/time";
import type { DashboardStats } from "@/lib/domain/adminBookings";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Alert({ href, Icon, children }: { href: string; Icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}

function Bars({ data }: { data: DashboardStats["chart"] }) {
  const max = Math.max(1, ...data.map((d) => d.Bookings));
  return (
    <div>
      <div className="flex h-20 items-end gap-1" role="img" aria-label={`Bookings in the last 14 days: ${data.map((d) => d.Bookings).join(", ")}`}>
        {data.map((d, i) => (
          <div key={d.date} className="flex h-full flex-1 flex-col justify-end">
            <div className={`rounded-t ${i === data.length - 1 ? "bg-blue-700" : "bg-blue-300"}`} style={{ height: `${Math.max(4, (d.Bookings / max) * 100)}%` }} title={`${d.date}: ${d.Bookings}`} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{data[0]?.date}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((json) => (json.status === "success" ? setStats(json.data) : toast.error(json.message || "Could not load the dashboard")))
      .catch(() => toast.error("Could not load the dashboard"));
  }, []);

  if (!stats) return <ListSkeleton rows={5} />;

  const day = new Date(`${istDateString()}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
  const a = stats.attention;
  const hasAlerts = stats.unassignedStale > 0 || a.reassignRequests > 0 || a.delayed > 0 || a.pendingClaims > 0 || a.failedMessages > 0;
  const free = Math.max(stats.technicians.active - stats.technicians.busy, 0);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{day}</p>
        <CitySwitcher />
      </div>

      {hasAlerts && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {stats.unassignedStale > 0 && (
            <Alert href="/admin/bookings" Icon={AlertTriangle}>
              {stats.unassignedStale} new {stats.unassignedStale === 1 ? "booking has" : "bookings have"} waited over {UNASSIGNED_ALERT_MINUTES} min
            </Alert>
          )}
          {a.delayed > 0 && (
            <Alert href="/admin/bookings" Icon={PauseCircle}>
              {a.delayed} {a.delayed === 1 ? "job is" : "jobs are"} delayed
            </Alert>
          )}
          {a.reassignRequests > 0 && (
            <Alert href="/admin/bookings" Icon={UserX}>
              {a.reassignRequests} {a.reassignRequests === 1 ? "technician cannot" : "technicians cannot"} attend a job
            </Alert>
          )}
          {a.pendingClaims > 0 && (
            <Alert href="/admin/warranty" Icon={ShieldCheck}>
              {a.pendingClaims} guarantee {a.pendingClaims === 1 ? "claim needs" : "claims need"} a decision
            </Alert>
          )}
          {a.failedMessages > 0 && (
            <Alert href="/admin/notifications" Icon={MessageSquareWarning}>
              {a.failedMessages} {a.failedMessages === 1 ? "message" : "messages"} failed to send
            </Alert>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile label="New bookings" value={stats.counts.new} note="Waiting for a technician" Icon={ClipboardList} tone={stats.counts.new > 0 ? "blue" : "slate"} href="/admin/bookings" />
        <StatTile label="Active jobs" value={stats.counts.active} note={`${stats.technicians.busy} of ${stats.technicians.active} technicians busy`} Icon={CalendarClock} tone="amber" href="/admin/bookings" />
        <StatTile label="Cash today" value={rupees(stats.today.collected)} note={`${stats.today.completed} done · ${stats.today.newBookings} new today`} Icon={IndianRupee} tone="green" href="/admin/finance" />
        <StatTile label="This month" value={rupees(stats.month.collected)} note={`${stats.month.completed} jobs completed`} Icon={TrendingUp} tone="slate" href="/admin/finance" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="grid content-start gap-3 lg:col-span-2">
          <Panel title={`Waiting for a technician (${stats.counts.new})`} action={<Link href="/admin/bookings" className="text-xs font-medium text-blue-700">See all</Link>}>
            {stats.newQueue.length === 0 ? (
              <EmptyState title="No new bookings waiting" text="New bookings appear here first." />
            ) : (
              <div className="grid gap-2">
                {stats.newQueue.map((b) => (
                  <BookingCard key={b.id} b={b} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Coming up" action={<Link href="/admin/bookings" className="text-xs font-medium text-blue-700">All jobs</Link>}>
            {stats.schedule.length === 0 ? (
              <EmptyState title="No confirmed jobs" text="Confirmed and running jobs show here by visit time." />
            ) : (
              <div className="grid gap-2">
                {stats.schedule.map((b) => (
                  <BookingCard key={b.id} b={b} overdue={b.isOverdue} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid content-start gap-3">
          <Panel title={`Team now · ${free} free`} action={<Link href="/admin/technicians" className="text-xs font-medium text-blue-700">Manage</Link>}>
            {stats.teamNow.length === 0 ? (
              <EmptyState title="No technicians yet" />
            ) : (
              <ul className="grid gap-1.5">
                {stats.teamNow.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/technicians/${t.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="truncate font-medium">{t.name}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${t.openJobs > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {t.openJobs > 0 ? `${t.openJobs} open` : "Free"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Bookings, last 14 days">
            <Bars data={stats.chart} />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              {stats.counts.completed} completed · {stats.counts.cancelled} cancelled, all time
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
