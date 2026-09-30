import type { Metadata } from "next";
import Footer from "@/components/custom/footer";
import HeroSection from "@/components/custom/hero";
import ServicesBrowser from "@/components/custom/ServicesBrowser";
import CustomerExperience from "@/components/custom/CustomerExperience";
import BrandsStrip from "@/components/custom/BrandsStrip";
import OurProfessionals from "@/components/custom/OurProfessionals";
import ReferAndEarn from "@/components/custom/ReferAndEarn";
import CoverageLinks from "@/components/custom/seo/CoverageLinks";
import JsonLd from "@/components/custom/seo/JsonLd";
import { getStorefrontAreas, getStorefrontReviews, getStorefrontServices, getStorefrontStats, getStorefrontTechnicians } from "@/lib/storefront";
import { localBusinessJsonLd } from "@/lib/seo";

// Admin edits refresh the page immediately via the "storefront" tag; this is the fallback.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const areas = await getStorefrontAreas();
  const where = areas.map((a) => a.district).join(" & ");
  return {
    title: { absolute: `Appliance Repair & Installation${where ? ` in ${where}` : ""} | Pleasure Cooling Care` },
    description: `AC, refrigerator, washing machine and geyser repair and installation at your home${where ? ` in ${where}` : ""}. Book online and track your booking with your mobile number.`,
    alternates: { canonical: "/home" },
  };
}

const Home = async () => {
  const [services, areas, reviews, stats, technicians] = await Promise.all([
    getStorefrontServices(),
    getStorefrontAreas(),
    getStorefrontReviews(),
    getStorefrontStats(),
    getStorefrontTechnicians(),
  ]);

  return (
    <div>
      <JsonLd data={localBusinessJsonLd(areas, reviews)} />
      <HeroSection areas={areas} />
      <ServicesBrowser services={services} reviewCount={reviews.summary.count} />
      <CustomerExperience reviews={reviews.reviews} summary={reviews.summary} completedJobs={stats.completedJobs} areaCount={areas.length} />
      <BrandsStrip />
      <OurProfessionals technicians={technicians} />
      <CoverageLinks areas={areas} services={services} />
      <ReferAndEarn />
      <Footer />
    </div>
  );
};

export default Home;
