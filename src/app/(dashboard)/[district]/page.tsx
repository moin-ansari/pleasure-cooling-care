import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookingForm from "@/components/custom/bookingForm";
import Contact from "@/components/custom/contact";
import Footer from "@/components/custom/footer";
import CoverageLinks from "@/components/custom/seo/CoverageLinks";
import FaqList from "@/components/custom/seo/FaqList";
import JsonLd from "@/components/custom/seo/JsonLd";
import { APPLIANCE_CATEGORIES, CATEGORY_LABELS, CATEGORY_SLUGS } from "@/constants/appliances";
import { CATEGORY_CONTENT, buildFaqs } from "@/constants/seoContent";
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd } from "@/lib/seo";
import { districtSlug, getStorefrontAreas, getStorefrontServices } from "@/lib/storefront";

export const revalidate = 300;

type Props = { params: { district: string } };

async function findArea(slug: string) {
  const areas = await getStorefrontAreas();
  return { areas, area: areas.find((a) => districtSlug(a.district) === slug) };
}

export async function generateStaticParams() {
  const areas = await getStorefrontAreas();
  return areas.map((a) => ({ district: districtSlug(a.district) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await findArea(params.district);
  if (!area) return {};
  return {
    title: `Home Appliance Repair & Installation in ${area.district}`,
    description: `AC, refrigerator, washing machine and geyser repair and installation at your home in ${area.district}, ${area.state}. Book online and track your booking with your mobile number.`,
    alternates: { canonical: `/${districtSlug(area.district)}` },
  };
}

export default async function DistrictPage({ params }: Props) {
  const [{ areas, area }, services] = await Promise.all([findArea(params.district), getStorefrontServices()]);
  if (!area) notFound();

  const categories = APPLIANCE_CATEGORIES.filter((c) => services.some((s) => s.applianceCategory === c));
  const slug = districtSlug(area.district);
  const faqs = buildFaqs(area.district, areas.map((a) => a.district));

  return (
    <div>
      <JsonLd data={localBusinessJsonLd(areas)} />
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/home" },
          { name: area.district, path: `/${slug}` },
        ])}
      />

      <main>
        <section className="px-3 py-8 sm:w-1/2 sm:m-auto">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-3">
            <Link href="/home" className="hover:underline">Home</Link> / <span>{area.district}</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Home appliance repair &amp; installation in {area.district}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Pleasure Cooling Care sends a technician to your home anywhere in {area.district} district, {area.state}. Choose your appliance below, pick a
            date and time, and book online. You can check your booking any time with just your mobile number.
          </p>
        </section>

        <section aria-labelledby="appliances-heading" className="px-3 pb-6 sm:w-1/2 sm:m-auto">
          <h2 id="appliances-heading" className="text-2xl font-bold text-gray-800 mb-4">
            Services in {area.district}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((c) => {
              const prices = services.filter((s) => s.applianceCategory === c).map((s) => s.price);
              return (
                <Link
                  key={c}
                  href={`/${slug}/${CATEGORY_SLUGS[c]}`}
                  className="rounded-md border p-4 hover:bg-accent transition-colors"
                >
                  <h3 className="font-semibold">{CATEGORY_LABELS[c]} repair &amp; installation</h3>
                  <p className="text-sm text-muted-foreground mt-1">{CATEGORY_CONTENT[c].intro(area.district).split(". ")[0]}.</p>
                  <p className="text-sm mt-2 font-medium">Starting from ₹{Math.min(...prices)}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <FaqList faqs={faqs} />
        <CoverageLinks areas={areas} services={services} excludeAreaId={area.id} heading="Also serving" />
      </main>

      <BookingForm services={services} areas={areas} defaultAreaId={area.id} />
      <Contact />
      <Footer />
    </div>
  );
}
