"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/components/custom/admin/AdminContext";
import { Chips, EmptyState, ListSkeleton, PageTitle } from "@/components/custom/admin/ui";
import { ACTIVITY_GROUPS, type ActivityGroupKey } from "@/constants/activity";
import type { ActivityList } from "@/lib/domain/activity";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

// Who changed what, and when. Owner only.
export default function ActivityPage() {
  const { me } = useAdmin();
  const [group, setGroup] = useState<ActivityGroupKey>("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ActivityList | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    const params = new URLSearchParams({ group, page: String(page), ...(search ? { q: search } : {}) });
    fetch(`/api/admin/activity?${params}`)
      .then(async (res) => {
        if (res.status === 403) return setDenied(true);
        const json = await res.json();
        if (cancelled) return;
        if (json.status === "success") setData(json.data);
        else toast.error(json.message || "Could not load the activity log");
      })
      .catch(() => !cancelled && toast.error("Could not load the activity log"));
    return () => {
      cancelled = true;
    };
  }, [group, search, page]);

  if (denied || (me && !me.isOwner)) return <EmptyState title="Only the owner can see this" />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Activity" sub={data ? `${data.total} recorded changes` : "Who changed what, and when"} />

      <div className="relative mb-2">
        <label htmlFor="activity-search" className="sr-only">
          Search the activity log
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input id="activity-search" className="h-11 bg-white pl-9" placeholder="Search by action or reference" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mb-3">
        <Chips<ActivityGroupKey>
          label="Kind of change"
          value={group}
          onChange={(g) => {
            setGroup(g);
            setPage(1);
          }}
          options={ACTIVITY_GROUPS.map((g) => ({ key: g.key, label: g.label }))}
        />
      </div>

      {!data ? (
        <ListSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState title="Nothing recorded here" />
      ) : (
        <ul className="grid gap-2">
          {data.items.map((a) => (
            <li key={a.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{a.label}</p>
                <span className="shrink-0 text-xs text-slate-500">{when(a.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                By {a.actorName}
                {a.href && (
                  <>
                    {" · "}
                    <Link href={a.href} className="text-blue-700 underline">
                      Open
                    </Link>
                  </>
                )}
              </p>
              {(a.details.before || a.details.after) && (
                <details className="mt-1 text-xs text-slate-600">
                  <summary className="cursor-pointer text-slate-500">Details</summary>
                  {a.details.before && (
                    <p className="mt-1">
                      <span className="font-medium">Before:</span> {a.details.before}
                    </p>
                  )}
                  {a.details.after && (
                    <p className="mt-1">
                      <span className="font-medium">After:</span> {a.details.after}
                    </p>
                  )}
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && data.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
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
