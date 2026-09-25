"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OrdersAreaChart from "@/components/custom/admin/ordersChart";
import { UNASSIGNED_ALERT_MINUTES } from "@/constants/booking";
import type { DashboardStats } from "@/lib/domain/adminBookings";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Stat({ title, value, note, tone }: { title: string; value: React.ReactNode; note?: React.ReactNode; tone?: "alert" }) {
  return (
    <Card className={tone === "alert" ? "border-red-300 bg-red-50" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <div className="text-2xl font-bold">{value}</div>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </CardContent>
    </Card>
  );
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((json) => (json.status === "success" ? setStats(json.data) : toast.error(json.message || "Could not load the dashboard")))
      .catch(() => toast.error("Could not load the dashboard"));
  }, []);

  if (!stats) {
    return <div className="p-3 h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-3 w-full grid gap-4">
      {stats.unassignedStale > 0 && (
        <Link
          href="/admin/bookings"
          className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-red-800"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">
            {stats.unassignedStale} new {stats.unassignedStale === 1 ? "booking has" : "bookings have"} waited more than {UNASSIGNED_ALERT_MINUTES} minutes without a technician.
          </span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="New bookings" value={stats.counts.new} note="Waiting to be confirmed" tone={stats.unassignedStale > 0 ? "alert" : undefined} />
        <Stat title="Active jobs" value={stats.counts.active} note="Confirmed, on the way or in progress" />
        <Stat
          title="Technicians"
          value={`${stats.technicians.busy} of ${stats.technicians.active} busy`}
          note={`${Math.max(stats.technicians.active - stats.technicians.busy, 0)} free right now`}
        />
        <Stat title="All time" value={`${stats.counts.completed} done`} note={`${stats.counts.cancelled} cancelled`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Today: new bookings" value={stats.today.newBookings} />
        <Stat title="Today: completed" value={stats.today.completed} />
        <Stat title="Cash collected today" value={rupees(stats.today.collected)} note="Recorded by technicians" />
        <Stat title="Cash collected this month" value={rupees(stats.month.collected)} note={`${stats.month.completed} jobs completed`} />
      </div>

      <OrdersAreaChart data={stats.chart} />

      <div>
        <Button asChild variant="outline">
          <Link href="/admin/bookings">
            Go to bookings <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
