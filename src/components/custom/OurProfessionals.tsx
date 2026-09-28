import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { CategoryIcon } from "@/components/custom/categoryIcons";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { PublicTechnician } from "@/lib/domain/technicians";

const RANK_STYLE: Record<PublicTechnician["rank"], string> = {
  BRONZE: "bg-amber-100 text-amber-900",
  SILVER: "bg-slate-200 text-slate-800",
  GOLD: "bg-yellow-100 text-yellow-900",
  DIAMOND: "bg-cyan-100 text-cyan-900",
};
const RANK_LABEL: Record<PublicTechnician["rank"], string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", DIAMOND: "Diamond" };

// Only technicians the admin has opted in (Technician.showOnWebsite) appear here. Renders nothing when
// none have opted in yet, rather than an empty/broken-looking section.
export default function OurProfessionals({ technicians }: { technicians: PublicTechnician[] }) {
  if (technicians.length === 0) return null;

  return (
    <section aria-labelledby="professionals-heading" className="px-3 py-8 sm:px-6">
      <h2 id="professionals-heading" className="mb-1 text-center text-2xl font-bold text-slate-900">
        Meet our professionals
      </h2>
      <p className="mb-5 text-center text-sm text-muted-foreground">Background-verified technicians, trained on every appliance we service</p>
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
        {technicians.map((t) => (
          <div key={t.id} className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
            <div className="relative mb-2 h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-slate-100">
              {t.photo ? (
                <Image src={t.photo} alt="" fill sizes="64px" className="object-cover" unoptimized />
              ) : (
                <span className="flex h-full items-center justify-center text-xl font-semibold text-slate-400">{t.name[0]}</span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
            <span className={`mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${RANK_STYLE[t.rank]}`}>{RANK_LABEL[t.rank]}</span>
            {t.ratingCount > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                {t.averageRating.toFixed(1)}
              </p>
            )}
            {t.experienceYears !== null && <p className="text-xs text-muted-foreground">{t.experienceYears}+ yrs experience</p>}
            {t.specializations.length > 0 && (
              <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                {t.specializations.map((s) => (
                  <span key={s} title={CATEGORY_LABELS[s]} className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-500">
                    <CategoryIcon category={s} className="h-3 w-3" />
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
