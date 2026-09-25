import Experiences from "@/components/custom/experiences";
import Services from "@/components/custom/services";
import Footer from "@/components/custom/footer";
import BookingForm from "@/components/custom/bookingForm";
import Contact from "@/components/custom/contact";
import HeroSection from "@/components/custom/hero";
import me from "@/db/me.data.json";
import { getStorefrontServices } from "@/lib/storefront";

// Admin edits refresh the page immediately via the "storefront" tag; this is the fallback.
export const revalidate = 300;

const Home = async () => {
  const services = await getStorefrontServices();

  return (
    <div>
      <HeroSection />
      <Services id="services" services={services} />
      <Experiences id="experiences" experience={me.experience} />
      <BookingForm services={services} />
      <Contact />
      <Footer />
    </div>
  );
};

export default Home;
