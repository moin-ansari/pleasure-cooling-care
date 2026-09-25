import { BUSINESS } from "@/constants/business";
import { CATEGORY_LABELS, type ApplianceCategoryValue } from "@/constants/appliances";
import type { Faq } from "@/constants/seoContent";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";
import type { ServiceItem } from "@/types/service";
import type { PublicReview, ReviewSummary } from "@/lib/domain/reviews";
import { SITE_URL, absoluteUrl } from "@/lib/site";

const BUSINESS_ID = `${SITE_URL}/#business`;

// Ratings are added only when there are real, public reviews.
export function localBusinessJsonLd(areas: ServiceAreaItem[], reviews?: { reviews: PublicReview[]; summary: ReviewSummary }) {
    const rated = reviews && reviews.summary.count > 0 ? reviews : null;
    return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": BUSINESS_ID,
        name: BUSINESS.name,
        url: SITE_URL,
        telephone: `+91${BUSINESS.phone}`,
        email: BUSINESS.email,
        address: {
            "@type": "PostalAddress",
            addressLocality: BUSINESS.address.locality,
            addressRegion: BUSINESS.address.region,
            postalCode: BUSINESS.address.postalCode,
            addressCountry: BUSINESS.address.country,
        },
        areaServed: areas.map((a) => ({ "@type": "AdministrativeArea", name: `${a.district}, ${a.state}` })),
        ...(rated
            ? {
                  aggregateRating: { "@type": "AggregateRating", ratingValue: rated.summary.average, reviewCount: rated.summary.count, bestRating: 5, worstRating: 1 },
                  review: rated.reviews.map((r) => ({
                      "@type": "Review",
                      author: { "@type": "Person", name: r.customerName },
                      datePublished: r.date,
                      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
                      ...(r.comment ? { reviewBody: r.comment } : {}),
                  })),
              }
            : {}),
    };
}

export function faqJsonLd(faqs: Faq[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
    };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path),
        })),
    };
}

export function serviceJsonLd(category: ApplianceCategoryValue, area: ServiceAreaItem, services: ServiceItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "Service",
        name: `${CATEGORY_LABELS[category]} repair and installation in ${area.district}`,
        serviceType: `${CATEGORY_LABELS[category]} repair and installation`,
        provider: { "@id": BUSINESS_ID },
        areaServed: { "@type": "AdministrativeArea", name: `${area.district}, ${area.state}` },
        offers: services.map((s) => ({
            "@type": "Offer",
            name: `${s.serviceType} (${s.applianceSubType})`,
            price: s.price,
            priceCurrency: "INR",
        })),
    };
}
