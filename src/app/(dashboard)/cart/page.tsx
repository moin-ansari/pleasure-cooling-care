import type { Metadata } from "next";
import CartView from "@/components/custom/CartView";
import { getStorefrontServices } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const services = await getStorefrontServices();
  return (
    <div>
      <h1 className="px-3 pb-2 pt-4 text-xl font-bold text-slate-900 sm:px-6">Your cart</h1>
      <CartView services={services} />
    </div>
  );
}
