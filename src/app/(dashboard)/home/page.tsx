import type { Metadata } from "next";
import Experiences from "@/components/custom/experiences";
import Services from "@/components/custom/services";
import Footer from "@/components/custom/footer";
import BookingForm from "@/components/custom/bookingForm";
import Contact from "@/components/custom/contact";
import HeroSection from "@/components/custom/hero";
import CoverageLinks from "@/components/custom/seo/CoverageLinks";
import JsonLd from "@/components/custom/seo/JsonLd";
import me from "@/db/me.data.json";
import { getStorefrontAreas, getStorefrontServices } from "@/lib/storefront";
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
  const [services, areas] = await Promise.all([getStorefrontServices(), getStorefrontAreas()]);

  return (
    <div>
      <JsonLd data={localBusinessJsonLd(areas)} />
      <HeroSection districts={areas.map((a) => a.district)} />
      <Services id="services" services={services} />
      <CoverageLinks areas={areas} services={services} />
      <Experiences id="experiences" experience={me.experience} />
      <BookingForm services={services} areas={areas} />
      <Contact />
      <Footer />
    </div>
  );
};

export default Home;
