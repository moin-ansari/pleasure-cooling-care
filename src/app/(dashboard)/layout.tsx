import CartProvider from "@/components/custom/CartProvider";
import StorefrontBottomNav from "@/components/custom/StorefrontBottomNav";

export default function Dashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <div className="pb-20">{children}</div>
      <StorefrontBottomNav />
    </CartProvider>
  );
}
