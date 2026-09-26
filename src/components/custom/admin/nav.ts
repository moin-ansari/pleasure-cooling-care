import { CalendarCheck, LayoutDashboard, MapPin, MessageSquare, Settings, ShieldCheck, Star, Users, Wallet, Wrench, type LucideIcon } from "lucide-react";
import type { AdminBadges } from "@/lib/domain/adminBadges";

export interface NavItem {
    href: string;
    label: string;
    Icon: LucideIcon;
    // Shown in the bottom bar on phones. Everything else lives in the menu.
    primary: boolean;
    badge?: keyof AdminBadges;
}

export const NAV_ITEMS: NavItem[] = [
    { href: "/admin/dashboard", label: "Home", Icon: LayoutDashboard, primary: true },
    { href: "/admin/bookings", label: "Bookings", Icon: CalendarCheck, primary: true, badge: "newBookings" },
    { href: "/admin/technicians", label: "Team", Icon: Users, primary: true },
    { href: "/admin/warranty", label: "Guarantee", Icon: ShieldCheck, primary: true, badge: "pendingClaims" },
    { href: "/admin/finance", label: "Money", Icon: Wallet, primary: true },
    { href: "/admin/services", label: "Services", Icon: Wrench, primary: false },
    { href: "/admin/reviews", label: "Reviews", Icon: Star, primary: false },
    { href: "/admin/service-areas", label: "Areas", Icon: MapPin, primary: false },
    { href: "/admin/notifications", label: "Messages", Icon: MessageSquare, primary: false, badge: "failedMessages" },
    { href: "/admin/settings", label: "Settings", Icon: Settings, primary: false },
];

export const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
