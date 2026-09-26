"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListSkeleton, PageTitle, Panel } from "@/components/custom/admin/ui";
import type { AdminSettings } from "@/lib/domain/settings";

type Loaded = AdminSettings & { smsConfigured: boolean };

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

const CUTOFFS = [
  { value: "CONFIRMED", label: "Until we confirm the booking" },
  { value: "ARRIVING", label: "Until the technician is on the way" },
  { value: "WORKING", label: "Until the technician starts the work" },
];

export default function SettingsPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [cutoff, setCutoff] = useState("ARRIVING");
  const [ranks, setRanks] = useState({ silverJobs: "", silverRating: "", goldJobs: "", goldRating: "", diamondJobs: "", diamondRating: "" });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.status !== "success") return toast.error(json.message || "Could not load settings");
        const d: Loaded = json.data;
        setData(d);
        setPhone(d.store?.adminAlertPhone ?? "");
        setCutoff(d.cancelBlockedFrom);
        setRanks({
          silverJobs: String(d.ranks.silver.minJobs),
          silverRating: String(d.ranks.silver.minRating),
          goldJobs: String(d.ranks.gold.minJobs),
          goldRating: String(d.ranks.gold.minRating),
          diamondJobs: String(d.ranks.diamond.minJobs),
          diamondRating: String(d.ranks.diamond.minRating),
        });
      })
      .catch(() => toast.error("Could not load settings"));
  }, []);

  const save = async (section: string, body: object) => {
    setSaving(section);
    try {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, ...body }) });
      const json = await res.json();
      (json.status === "success" ? toast.success : toast.error)(json.message || "Could not save");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(null);
    }
  };

  if (!data) return <ListSkeleton rows={4} />;
  const canEdit = data.canEditGlobal;
  const cutoffLabel = CUTOFFS.find((c) => c.value === data.cancelBlockedFrom)?.label ?? "";

  const numberInput = (id: string, value: string, set: (v: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Input id={id} type="number" inputMode="decimal" className="h-11" value={value} onChange={(e) => set(e.target.value)} {...extra} />
  );

  return (
    <div className="mx-auto grid max-w-3xl gap-3">
      <PageTitle title="Settings" sub={canEdit ? "Rules for the whole business. Each section saves on its own." : "Your store's alert number. The business-wide rules are set by the owner."} />

      <Panel title={`New booking alert${data.store ? ` · ${data.store.name}` : ""}`}>
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save("alert", { adminAlertPhone: phone });
          }}
        >
          <Field id="alert-phone" label="Send me an SMS on every new booking" hint="Leave empty to turn these alerts off.">
            <Input id="alert-phone" type="tel" inputMode="numeric" className="h-11" placeholder="10 digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <p className={`rounded-md px-2.5 py-1.5 text-xs ${data.smsConfigured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {data.smsConfigured ? "SMS is switched on." : "SMS is not set up on the server yet, so alerts are recorded in Messages but not sent."}
          </p>
          <Button type="submit" disabled={saving === "alert"} className="justify-self-start">
            {saving === "alert" ? "Saving..." : "Save"}
          </Button>
        </form>
      </Panel>

      {canEdit ? (
        <>
          <Panel title="Commission and stores">
            <p className="text-sm text-slate-600">
              What technicians pay, your share and the flat amount are set per store on the{" "}
              <Link href="/admin/stores" className="text-blue-700 underline">
                Stores
              </Link>{" "}
              screen.
            </p>
          </Panel>

          <Panel title="Customer cancellation">
            <form
              className="grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save("cutoff", { cancelBlockedFrom: cutoff });
              }}
            >
              <Field id="cutoff" label="Customers can cancel online">
                <select id="cutoff" value={cutoff} onChange={(e) => setCutoff(e.target.value)} className="h-11 rounded-md border bg-background px-3 text-sm">
                  {CUTOFFS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" disabled={saving === "cutoff"} className="justify-self-start">
                {saving === "cutoff" ? "Saving..." : "Save"}
              </Button>
            </form>
          </Panel>

          <Panel title="Technician ranks">
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                save("ranks", {
                  silver: { minJobs: Number(ranks.silverJobs), minRating: Number(ranks.silverRating) },
                  gold: { minJobs: Number(ranks.goldJobs), minRating: Number(ranks.goldRating) },
                  diamond: { minJobs: Number(ranks.diamondJobs), minRating: Number(ranks.diamondRating) },
                });
              }}
            >
              <p className="text-[11px] text-slate-500">A technician needs both the completed jobs and the average rating. Everyone starts at Bronze. Saving updates all technicians straight away.</p>
              {(["silver", "gold", "diamond"] as const).map((tier) => (
                <div key={tier} className="grid grid-cols-2 gap-2">
                  <Field id={`${tier}-jobs`} label={`${tier[0].toUpperCase()}${tier.slice(1)}: completed jobs`}>
                    {numberInput(`${tier}-jobs`, ranks[`${tier}Jobs`], (v) => setRanks({ ...ranks, [`${tier}Jobs`]: v }), { min: 1 })}
                  </Field>
                  <Field id={`${tier}-rating`} label="Average rating">
                    {numberInput(`${tier}-rating`, ranks[`${tier}Rating`], (v) => setRanks({ ...ranks, [`${tier}Rating`]: v }), { step: "0.1", min: 1, max: 5 })}
                  </Field>
                </div>
              ))}
              <Button type="submit" disabled={saving === "ranks"} className="justify-self-start">
                {saving === "ranks" ? "Saving..." : "Save"}
              </Button>
            </form>
          </Panel>
        </>
      ) : (
        <Panel title="Rules set by the owner">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Customers can cancel</dt>
            <dd>{cutoffLabel}</dd>
            <dt className="text-slate-500">Silver</dt>
            <dd>
              {data.ranks.silver.minJobs} jobs and {data.ranks.silver.minRating} rating
            </dd>
            <dt className="text-slate-500">Gold</dt>
            <dd>
              {data.ranks.gold.minJobs} jobs and {data.ranks.gold.minRating} rating
            </dd>
            <dt className="text-slate-500">Diamond</dt>
            <dd>
              {data.ranks.diamond.minJobs} jobs and {data.ranks.diamond.minRating} rating
            </dd>
          </dl>
          <p className="mt-2 text-[11px] text-slate-500">Your store&apos;s commission terms are on the My store screen.</p>
        </Panel>
      )}
    </div>
  );
}
