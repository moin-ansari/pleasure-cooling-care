"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chips } from "@/components/custom/admin/ui";
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
      <Chips<RangePreset> label="Period" value={value.preset} onChange={(p) => onChange({ preset: p, from, to })} options={PRESETS.map((p) => ({ key: p, label: RANGE_LABELS[p] }))} />
      {value.preset === "custom" && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <div className="grid gap-1">
            <label htmlFor="range-from" className="text-xs font-medium">
              From
            </label>
            <Input id="range-from" type="date" className="h-11 bg-white" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="range-to" className="text-xs font-medium">
              To
            </label>
            <Input id="range-to" type="date" className="h-11 bg-white" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button className="col-span-2 h-11 sm:col-span-1" onClick={() => onChange({ preset: "custom", from, to })} disabled={!from || !to || from > to}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
