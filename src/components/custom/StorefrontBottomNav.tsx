"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Home, MessageCircleQuestion, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/custom/CartProvider";
import { BUSINESS } from "@/constants/business";

// Same fixed-bottom-bar shape as the admin and technician portals (TechnicianNav.tsx), just for the public
// site. Help opens WhatsApp for now — a placeholder until it becomes an AI booking chat.
export default function StorefrontBottomNav() {
  const pathname = usePathname();
  const { totalCount } = useCart();

  const items = [
    { key: "home", href: "/home", label: "Home", Icon: Home, active: pathname === "/home" },
    { key: "track", href: "/track", label: "Track request", Icon: ClipboardCheck, active: pathname === "/track" },
    { key: "cart", href: "/cart", label: "Cart", Icon: ShoppingCart, active: pathname === "/cart" || pathname === "/checkout", badge: totalCount },
    { key: "help", href: `https://wa.me/91${BUSINESS.whatsapp}`, label: "Help", Icon: MessageCircleQuestion, external: true },
  ];

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <ul className="mx-auto flex max-w-md">
        {items.map(({ key, href, label, Icon, active, badge, external }) => (
          <li key={key} className="flex-1">
            <Link
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? "text-blue-700" : "text-muted-foreground"}`}
            >
              <span className="relative">
                <Icon className="h-6 w-6" aria-hidden="true" />
                {!!badge && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
