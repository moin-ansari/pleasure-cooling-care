import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookingForm from "@/components/custom/bookingForm";
import Contact from "@/components/custom/contact";
import Footer from "@/components/custom/footer";
import ServiceCard from "@/components/custom/serviceCard";
import CoverageLinks from "@/components/custom/seo/CoverageLinks";
import FaqList from "@/components/custom/seo/FaqList";
import JsonLd from "@/components/custom/seo/JsonLd";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, CATEGORY_SLUGS, categoryFromSlug } from "@/constants/appliances";
import { CATEGORY_CONTENT, buildFaqs } from "@/constants/seoContent";
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd, serviceJsonLd } from "@/lib/seo";
import { districtSlug, getStorefrontAreas, getStorefrontServices } from "@/lib/storefront";

export const revalidate = 300;

type Props = { params: { district: string; category: string } };

async function load(params: Props["params"]) {
  const [areas, services] = await Promise.all([getStorefrontAreas(), getStorefrontServices()]);
  const area = areas.find((a) => districtSlug(a.district) === params.district);
  const category = categoryFromSlug(params.category);
  const categoryServices = category ? services.filter((s) => s.applianceCategory === category) : [];
  return { areas, services, area, category, categoryServices };
}

export async function generateStaticParams() {
  const [areas, services] = await Promise.all([getStorefrontAreas(), getStorefrontServices()]);
  return areas.flatMap((a) =>
    APPLIANCE_CATEGORIES.filter((c) => services.some((s) => s.applianceCategory === c)).map((c) => ({
      district: districtSlug(a.district),
      category: CATEGORY_SLUGS[c],
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area, category, categoryServices } = await load(params);
  if (!area || !category || categoryServices.length === 0) return {};
  const content = CATEGORY_CONTENT[category];
  const from = Math.min(...categoryServices.map((s) => s.price));
  return {
    title: `${content.heading} Repair & Installation in ${area.district}`,
    description: `Book ${content.noun} repair and installation at home in ${area.district}. Prices from ₹${from}. Track your booking online with your mobile number.`,
    alternates: { canonical: `/${districtSlug(area.district)}/${CATEGORY_SLUGS[category]}` },
  };
}

const STEPS = [
  { title: "Book online", text: "Choose your service, address, date and time in the form on this page." },
  { title: "We confirm", text: "We confirm your booking and assign a technician." },
  { title: "Technician visits", text: "Our technician comes to your home, checks the appliance and does the work." },
];

export default async function CategoryPage({ params }: Props) {
  const { areas, services, area, category, categoryServices } = await load(params);
  if (!area || !category || categoryServices.length === 0) notFound();

  const content = CATEGORY_CONTENT[category];
  const slug = districtSlug(area.district);
  const faqs = buildFaqs(area.district, areas.map((a) => a.district), category);

  return (
    <div>
      <JsonLd data={localBusinessJsonLd(areas)} />
      <JsonLd data={serviceJsonLd(category, area, categoryServices)} />
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/home" },
          { name: area.district, path: `/${slug}` },
          { name: `${CATEGORY_LABELS[category]} repair`, path: `/${slug}/${CATEGORY_SLUGS[category]}` },
        ])}
      />

      <main>
        <section className="px-3 py-8 sm:w-1/2 sm:m-auto">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-3">
            <Link href="/home" className="hover:underline">Home</Link> /{" "}
            <Link href={`/${slug}`} className="hover:underline">{area.district}</Link> / <span>{CATEGORY_LABELS[category]}</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            {content.heading} repair &amp; installation in {area.district}
          </h1>
          <p className="text-muted-foreground leading-relaxed">{content.intro(area.district)}</p>
        </section>

        <section aria-labelledby="services-heading" className="py-2">
          <h2 id="services-heading" className="text-2xl font-bold text-primary text-center mb-6">
            {CATEGORY_LABELS[category]} services and prices
          </h2>
          <ServiceCard services={categoryServices} />
        </section>

        <section aria-labelledby="problems-heading" className="px-3 py-8 sm:w-1/2 sm:m-auto">
          <h2 id="problems-heading" className="text-2xl font-bold text-gray-800 mb-3">
            {content.problemsTitle}
          </h2>
          <ul className="list-disc pl-5 grid gap-1 text-muted-foreground sm:grid-cols-2">
            {content.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-heading" className="px-3 pb-6 sm:w-1/2 sm:m-auto">
          <h2 id="how-heading" className="text-2xl font-bold text-gray-800 mb-4">
            How it works
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Step {i + 1}</p>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <FaqList faqs={faqs} />
        <CoverageLinks areas={areas} services={services} excludeAreaId={area.id} heading="Also serving" />
      </main>

      <BookingForm services={services} areas={areas} defaultCategory={category} defaultAreaId={area.id} />
      <Contact />
      <Footer />
    </div>
  );
}
