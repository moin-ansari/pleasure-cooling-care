import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Droplets, Plug, ShieldCheck, Star, Wrench } from "lucide-react";
import ServiceDetailAddToCart from "@/components/custom/ServiceDetailAddToCart";
import BrandsStrip from "@/components/custom/BrandsStrip";
import OurProfessionals from "@/components/custom/OurProfessionals";
import ReviewsSection from "@/components/custom/seo/ReviewsSection";
import FaqList from "@/components/custom/seo/FaqList";
import JsonLd from "@/components/custom/seo/JsonLd";
import { CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import { CATEGORY_CONTENT, buildFaqs } from "@/constants/seoContent";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { getStorefrontAreas, getStorefrontReviews, getStorefrontServices, getStorefrontTechnicians } from "@/lib/storefront";
import { discountPercent, groupPriceLabel, groupServices, strikeoutPrice, type ServiceGroup } from "@/lib/serviceGroups";

const FALLBACK_IMAGE = "/service_half1.jpeg";

// The owner's stated target rating — a fixed marketing number, independent of the real review count.
// Kept the same value used on the card grid so the two never disagree.
const RATING = 4.5;

const PROCESS_STEPS = [
  { title: "Add to cart", text: "Choose this service (and quantity, if you need more than one) and add it to your cart." },
  { title: "Checkout once", text: "Share your address, date and time once for everything in your cart." },
  { title: "We confirm", text: "We confirm your booking and assign a background-verified technician." },
  { title: "Technician visits", text: "Our technician arrives, checks the appliance, and completes the work." },
];

type Props = { params: { id: string } };

async function loadGroup(id: string): Promise<{ group: ServiceGroup; allGroups: ServiceGroup[] } | null> {
  const services = await getStorefrontServices();
  const allGroups = groupServices(services);
  const group = allGroups.find((g) => g.serviceIds.includes(id));
  return group ? { group, allGroups } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadGroup(params.id);
  if (!data) return {};
  const { group } = data;
  return {
    title: `${group.serviceType} (${group.subTypes.join(" / ")})`,
    description: `${group.serviceType} for ${CATEGORY_LABELS[group.category]} at home — ${groupPriceLabel(group.prices)}${
      group.warrantyDays > 0 ? `, ${group.warrantyDays}-day guarantee` : ""
    }. Book online and track your booking with your mobile number.`,
  };
}

export default async function ServiceDetailsPage({ params }: Props) {
  const data = await loadGroup(params.id);
  if (!data) notFound();
  const { group } = data;

  const [areas, reviewsData, technicians] = await Promise.all([getStorefrontAreas(), getStorefrontReviews(), getStorefrontTechnicians()]);

  const pricesVary = !group.prices.every((p) => p === group.prices[0]);
  const categoryReviews = reviewsData.reviews.filter((r) => r.applianceCategory === group.category);
  const categorySummary = {
    count: categoryReviews.length,
    average: categoryReviews.length ? Math.round((categoryReviews.reduce((s, r) => s + r.rating, 0) / categoryReviews.length) * 10) / 10 : 0,
  };
  const categoryTechnicians = technicians.filter((t) => t.specializations.includes(group.category));
  const content = CATEGORY_CONTENT[group.category];
  const where = areas.map((a) => a.district).join(" & ") || "your area";
  const faqs = buildFaqs(where, areas.map((a) => a.district), group.category);
  const isWallMounted = (["AC", "GEYSER"] as ApplianceCategoryValue[]).includes(group.category);

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/home" },
          { name: CATEGORY_LABELS[group.category], path: "/home#services" },
          { name: group.serviceType, path: `/services/${group.serviceIds[0]}` },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <div className="mx-auto max-w-xl px-2 py-5 sm:px-4">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link href="/home" className="hover:underline">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/home#services" className="hover:underline">
            {CATEGORY_LABELS[group.category]}
          </Link>{" "}
          / <span>{group.serviceType}</span>
        </nav>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100">
          <Image src={group.image || FALLBACK_IMAGE} alt="" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover" priority />
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[group.category]}</span>
          <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
            {group.serviceType} <span className="font-normal text-muted-foreground">({group.subTypes.join(" / ")})</span>
          </h1>

          {categorySummary.count > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-700">{RATING}</span>
              <span className="text-sm text-muted-foreground">
                ({categorySummary.count} {categorySummary.count === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{groupPriceLabel(group.prices)}</span>
            <span className="text-base font-normal text-muted-foreground line-through">₹{strikeoutPrice(group.prices)}</span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">{discountPercent(group.prices)}% off</span>
          </div>
          {pricesVary && (
            <ul className="mt-1 text-sm text-muted-foreground">
              {group.subTypes.map((t, i) => (
                <li key={t}>
                  {t}: ₹{group.prices[i]}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Trusted by customers across {where} for reliable {content.noun} service, done at your home by a background-verified technician.
          </p>

          {group.desc.length > 0 && (
            <ul className="mt-3 grid gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
              {group.desc.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm leading-snug text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <ServiceDetailAddToCart group={group} />
          </div>
        </div>
      </div>

      <section aria-labelledby="process-heading" className="px-2 py-8 sm:px-4">
        <h2 id="process-heading" className="mb-1 flex items-center justify-center gap-2 text-center text-2xl font-bold text-slate-900">
          <Wrench className="h-5 w-5 text-blue-700" aria-hidden="true" />
          Our process
        </h2>
        <ol className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          {PROCESS_STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-blue-700">Step {i + 1}</p>
              <p className="mt-0.5 font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {group.warrantyDays > 0 && (
        <section className="px-2 py-2 sm:px-4">
          <div className="mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-emerald-900">{group.warrantyDays}-day guarantee</p>
              <p className="mt-0.5 text-sm text-emerald-800">
                If the same issue comes back within {group.warrantyDays} days, we&apos;ll fix it again at no extra charge.{" "}
                <Link href="/guarantee-terms" className="font-medium underline">
                  See full guarantee terms
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="included-heading" className="mx-auto max-w-xl px-2 py-6 sm:px-4">
        <h2 id="included-heading" className="text-lg font-bold text-slate-900">
          What&apos;s included
        </h2>
        <ul className="mt-2 grid gap-1.5">
          {["Diagnosis by a trained technician before any repair starts", "Spare parts cost (if needed) confirmed with you before work begins", "Clean-up of the work area once the job is done"].map(
            (line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{line}</span>
              </li>
            )
          )}
        </ul>
      </section>

      <section aria-labelledby="need-heading" className="mx-auto max-w-xl px-2 py-2 sm:px-4">
        <h2 id="need-heading" className="text-lg font-bold text-slate-900">
          What we&apos;ll need from you
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-100 bg-white p-3">
            <Plug className="mx-auto h-5 w-5 text-blue-700" aria-hidden="true" />
            <p className="mt-1 text-xs text-slate-700">Power point access</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-3">
            <Droplets className="mx-auto h-5 w-5 text-blue-700" aria-hidden="true" />
            <p className="mt-1 text-xs text-slate-700">Clear access to the appliance</p>
          </div>
          {isWallMounted && (
            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <Wrench className="mx-auto h-5 w-5 text-blue-700" aria-hidden="true" />
              <p className="mt-1 text-xs text-slate-700">A ladder, for wall-mounted units</p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="note-heading" className="mx-auto max-w-xl px-2 py-6 sm:px-4">
        <h2 id="note-heading" className="text-sm font-semibold text-slate-500">
          Please note
        </h2>
        <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
          <li>• The guarantee covers the work done, not spare parts fitted by anyone else.</li>
          <li>• The exact repair cost depends on what the technician finds — you&apos;ll be told before any paid work starts.</li>
        </ul>
      </section>

      <BrandsStrip />
      <OurProfessionals technicians={categoryTechnicians} />
      <FaqList faqs={faqs} />
      <ReviewsSection reviews={categoryReviews} summary={categorySummary} heading={`${CATEGORY_LABELS[group.category]} customer reviews`} />
    </div>
  );
}
