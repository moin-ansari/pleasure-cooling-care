"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Small shared pieces so every admin screen looks and behaves the same. Tight spacing: information first.

export function PageTitle({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold leading-tight text-slate-900">{title}</h1>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

type Tone = "blue" | "green" | "amber" | "red" | "slate";
const TONES: Record<Tone, { box: string; icon: string }> = {
  blue: { box: "bg-blue-50 border-blue-100", icon: "bg-blue-600 text-white" },
  green: { box: "bg-emerald-50 border-emerald-100", icon: "bg-emerald-600 text-white" },
  amber: { box: "bg-amber-50 border-amber-100", icon: "bg-amber-500 text-white" },
  red: { box: "bg-red-50 border-red-200", icon: "bg-red-600 text-white" },
  slate: { box: "bg-white border-slate-200", icon: "bg-slate-700 text-white" },
};

export function StatTile({
  label,
  value,
  note,
  Icon,
  tone = "slate",
  href,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  Icon?: React.ElementType;
  tone?: Tone;
  href?: string;
}) {
  const t = TONES[tone];
  const body = (
    <div className={`flex h-full items-center gap-2 rounded-xl border p-2 ${t.box}`}>
      {Icon && (
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-slate-500">{label}</p>
        <p className="text-xl font-bold leading-6 text-slate-900">{value}</p>
        {note && <p className="text-[11px] leading-tight text-slate-500">{note}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Chips<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string; count?: number }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`min-h-[36px] rounded-full border px-3 text-sm font-medium ${value === o.key ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 opacity-80">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-white px-4 py-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}

// A row that becomes a card on a phone. Whole card is the tap target.
export function RowCard({ href, onClick, children, tone }: { href?: string; onClick?: () => void; children: React.ReactNode; tone?: "alert" }) {
  const cls = `flex items-stretch gap-2 rounded-xl border bg-white p-3 shadow-sm ${tone === "alert" ? "border-red-300 bg-red-50" : ""}`;
  const chevron = <ChevronRight className="mt-1 h-5 w-5 shrink-0 self-start text-slate-400" aria-hidden="true" />;
  if (href)
    return (
      <Link href={href} className={`${cls} focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600`}>
        <div className="min-w-0 flex-1">{children}</div>
        {chevron}
      </Link>
    );
  return (
    <div className={cls} onClick={onClick}>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
