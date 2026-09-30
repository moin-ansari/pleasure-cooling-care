import type { Metadata } from "next";
import Link from "next/link";
import CheckoutForm from "@/components/custom/CheckoutForm";
import { getStorefrontAreas, getStorefrontServices } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [services, areas] = await Promise.all([getStorefrontServices(), getStorefrontAreas()]);
  return (
    <div>
      <h1 className="px-3 pb-2 pt-4 text-xl font-bold text-slate-900 sm:px-6">Checkout</h1>
      <CheckoutForm services={services} areas={areas} />
      {/* Always rendered (not gated on the cart being loaded) so this notice is present regardless of
          client-side cart state. */}
      <p className="px-3 pb-6 text-center text-xs text-muted-foreground sm:px-6">
        By booking you agree to our{" "}
        <Link href="/terms" className="text-blue-700 underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-blue-700 underline">
          Privacy Policy
        </Link>
        . We use your name, number and address only to arrange and contact you about this booking.
      </p>
    </div>
  );
}
