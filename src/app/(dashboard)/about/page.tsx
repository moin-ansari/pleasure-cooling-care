import type { Metadata } from "next";
import Link from "next/link";
import Contact from "@/components/custom/contact";
import Footer from "@/components/custom/footer";
import JsonLd from "@/components/custom/seo/JsonLd";
import ReviewsSection from "@/components/custom/seo/ReviewsSection";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, CATEGORY_SLUGS } from "@/constants/appliances";
import { BACKGROUND } from "@/constants/about";
import { BUSINESS } from "@/constants/business";
import { breadcrumbJsonLd, localBusinessJsonLd } from "@/lib/seo";
import { districtSlug, getStorefrontAreas, getStorefrontReviews, getStorefrontServices } from "@/lib/storefront";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const areas = await getStorefrontAreas();
  const where = areas.map((a) => a.district).join(" and ");
  return {
    title: "About us",
    description: `${BUSINESS.name} repairs and installs ACs, refrigerators, washing machines and geysers at your home${where ? ` in ${where}` : ""}. Learn how we work.`,
    alternates: { canonical: "/about" },
  };
}

const STEPS = [
  { title: "Book online", text: "Pick your service, address, date and time. You see the price before you book, and you only need your mobile number." },
  { title: "We confirm", text: "We confirm your booking and assign a technician. You get a message with their name and arrival time." },
  { title: "Technician visits", text: "Your technician arrives, checks the appliance and does the work. You can track every step with your mobile number." },
  { title: "Pay after the work", text: "Pay the technician in cash once the work is done. Some services come with a guarantee, shown on the service before you book." },
];

export default async function AboutPage() {
  const [areas, services, reviews] = await Promise.all([getStorefrontAreas(), getStorefrontServices(), getStorefrontReviews()]);
  const categories = APPLIANCE_CATEGORIES.filter((c) => services.some((s) => s.applianceCategory === c));

  return (
    <div>
      <JsonLd data={localBusinessJsonLd(areas, reviews)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/home" },
          { name: "About us", path: "/about" },
        ])}
      />

      <main>
        <section className="px-3 py-8 sm:w-1/2 sm:m-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">About {BUSINESS.name}</h1>
          <p className="text-muted-foreground leading-relaxed">
            We repair and install air conditioners, refrigerators, washing machines and geysers at your home
            {areas.length > 0 && <> in {areas.map((a) => a.district).join(" and ")}</>}. Our technicians come to you, so you do not have to carry a heavy appliance anywhere.
          </p>
        </section>

        {categories.length > 0 && (
          <section aria-labelledby="what-heading" className="px-3 pb-6 sm:w-1/2 sm:m-auto">
            <h2 id="what-heading" className="text-2xl font-bold text-gray-800 mb-3">
              What we do
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {categories.map((c) => (
                <li key={c} className="rounded-md border p-3">
                  <p className="font-semibold">{CATEGORY_LABELS[c]}</p>
                  <p className="text-sm text-muted-foreground">
                    {areas.length > 0 ? (
                      areas.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ", "}
                          <Link href={`/${districtSlug(a.district)}/${CATEGORY_SLUGS[c]}`} className="underline">
                            {a.district}
                          </Link>
                        </span>
                      ))
                    ) : (
                      "Repair and installation"
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="how-heading" className="px-3 py-6 sm:w-1/2 sm:m-auto">
          <h2 id="how-heading" className="text-2xl font-bold text-gray-800 mb-4">
            How it works
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Step {i + 1}</p>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="background-heading" className="px-3 py-6 sm:w-1/2 sm:m-auto">
          <h2 id="background-heading" className="text-2xl font-bold text-gray-800 mb-3">
            Our experience
          </h2>
          <ul className="grid gap-3">
            {BACKGROUND.map((item) => (
              <li key={item.company} className="rounded-md border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">{item.company}</p>
                  <p className="text-sm text-muted-foreground">{item.period}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{item.work}</p>
              </li>
            ))}
          </ul>
        </section>

        <ReviewsSection reviews={reviews.reviews} summary={reviews.summary} />

        <section className="px-3 pb-6 text-center">
          <Link href="/home#bookingForm" className="inline-block rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium">
            Book a service
          </Link>
        </section>
      </main>

      <Contact />
      <Footer />
    </div>
  );
}
