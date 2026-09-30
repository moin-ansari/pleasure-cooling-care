import React from "react";
import { CheckCircle2, MapPinned, ShieldCheck, Star } from "lucide-react";
import ReviewsSection, { Stars } from "@/components/custom/seo/ReviewsSection";
import type { PublicReview, ReviewSummary } from "@/lib/domain/reviews";

function Stat({ Icon, value, label }: { Icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-white px-3 py-4 text-center shadow-sm">
      <Icon className="h-6 w-6 text-blue-700" aria-hidden="true" />
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+` : String(n));

export default function CustomerExperience({
  reviews,
  summary,
  completedJobs,
  areaCount,
}: {
  reviews: PublicReview[];
  summary: ReviewSummary;
  completedJobs: number;
  areaCount: number;
}) {
  return (
    <section aria-labelledby="experience-heading" className="bg-slate-50 px-2 py-8 sm:px-4">
      <h2 id="experience-heading" className="mb-5 text-center text-2xl font-bold text-slate-900">
        Trusted by customers near you
      </h2>
      <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat Icon={CheckCircle2} value={compact(completedJobs)} label="Jobs completed" />
        <Stat Icon={Star} value={summary.count > 0 ? summary.average.toFixed(1) : "New"} label={summary.count > 0 ? `${compact(summary.count)} reviews` : "No reviews yet"} />
        <Stat Icon={ShieldCheck} value="Verified" label="Background-checked technicians" />
        <Stat Icon={MapPinned} value={areaCount} label={areaCount === 1 ? "City covered" : "Cities covered"} />
      </div>

      {reviews.length > 0 ? (
        <div className="mt-6">
          <ReviewsSection reviews={reviews} summary={summary} heading="What our customers say" />
        </div>
      ) : (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Stars value={0} /> Be the first to leave a review after your service.
        </p>
      )}
    </section>
  );
}
