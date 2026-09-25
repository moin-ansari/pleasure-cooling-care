"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RANGE_LABELS, type RangePreset } from "@/lib/dateRange";

export interface RangeValue {
  preset: RangePreset;
  from: string;
  to: string;
}

const PRESETS: RangePreset[] = ["today", "this_month", "last_month", "last_30", "all", "custom"];

export const rangeQuery = (v: RangeValue): string =>
  new URLSearchParams({ range: v.preset, ...(v.preset === "custom" ? { from: v.from, to: v.to } : {}) }).toString();

export default function RangeSelector({ value, onChange }: { value: RangeValue; onChange: (v: RangeValue) => void }) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);

  return (
    <div className="grid gap-2">
      <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={value.preset === p ? "default" : "outline"}
            aria-pressed={value.preset === p}
            onClick={() => onChange({ preset: p, from, to })}
          >
            {RANGE_LABELS[p]}
          </Button>
        ))}
      </div>
      {value.preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <label htmlFor="range-from" className="text-xs font-medium">
              From
            </label>
            <Input id="range-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="range-to" className="text-xs font-medium">
              To
            </label>
            <Input id="range-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => onChange({ preset: "custom", from, to })} disabled={!from || !to || from > to}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
