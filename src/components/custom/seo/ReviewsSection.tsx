import { BsStar, BsStarFill } from "react-icons/bs";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { PublicReview, ReviewSummary } from "@/lib/domain/reviews";

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex text-amber-500" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (n <= Math.round(value) ? <BsStarFill key={n} aria-hidden="true" /> : <BsStar key={n} aria-hidden="true" />))}
    </span>
  );
}

const day = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

// Real, public customer reviews only. Renders nothing until there is at least one.
export default function ReviewsSection({ reviews, summary, heading = "What our customers say" }: { reviews: PublicReview[]; summary?: ReviewSummary; heading?: string }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-heading" className="px-3 py-8 sm:w-1/2 sm:m-auto">
      <h2 id="reviews-heading" className="text-2xl font-bold text-gray-800 text-center mb-2">
        {heading}
      </h2>
      {summary && summary.count > 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-5">
          <Stars value={summary.average} />
          <span>
            {summary.average.toFixed(1)} from {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </span>
        </p>
      )}
      <ul className="grid gap-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars value={r.rating} />
              <time dateTime={r.date} className="text-xs text-muted-foreground">
                {day(r.date)}
              </time>
            </div>
            {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{r.customerName}</span> · {r.serviceType} ({CATEGORY_LABELS[r.applianceCategory]}) · Technician {r.technicianFirstName}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
