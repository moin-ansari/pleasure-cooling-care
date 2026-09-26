"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Snowflake } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS, isActivePath, type NavItem } from "@/components/custom/admin/nav";
import type { AdminBadges } from "@/lib/domain/adminBadges";

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[20px] rounded-full bg-red-600 px-1.5 text-center text-[11px] font-semibold leading-5 text-white" aria-label={`${count} waiting`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

async function logout() {
  await fetch("/api/users/logout", { method: "POST" }).catch(() => undefined);
  window.location.href = "/login";
}

const SidebarLink = React.forwardRef<HTMLAnchorElement, { item: NavItem; active: boolean; badges: AdminBadges | null } & React.ComponentPropsWithoutRef<"a">>(
  function SidebarLink({ item, active, badges, ...rest }, ref) {
    const count = item.badge && badges ? badges[item.badge] : 0;
    return (
      <Link
        {...rest}
        ref={ref}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {item.label}
        <Badge count={count} />
      </Link>
    );
  }
);

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<AdminBadges | null>(null);

  const loadBadges = useCallback(() => {
    fetch("/api/admin/badges")
      .then((r) => r.json())
      .then((json) => json.status === "success" && setBadges(json.data))
      .catch(() => undefined);
  }, []);

  // Counts refresh on every page change.
  useEffect(() => {
    loadBadges();
  }, [pathname, loadBadges]);

  // If the login expires, any admin request that comes back 401 sends the admin to the login page.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0]);
      if (res.status === 401 && url.includes("/api/admin/")) window.location.href = "/login?expired=1";
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  const primary = NAV_ITEMS.filter((i) => i.primary);
  const secondary = NAV_ITEMS.filter((i) => !i.primary);
  const moreCount = secondary.reduce((n, i) => n + (i.badge && badges ? badges[i.badge] : 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 md:pl-60">
      {/* Laptop and tablet: every destination in the side bar. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-white md:flex" aria-label="Admin">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold text-blue-800">
          <Snowflake className="h-5 w-5" aria-hidden="true" /> Pleasure Cooling Care
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} badges={badges} />
          ))}
        </nav>
        <div className="border-t p-3">
          <button onClick={logout} className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
            <LogOut className="h-5 w-5" aria-hidden="true" /> Log out
          </button>
        </div>
      </aside>

      {/* Phone: blue title bar with the menu for everything that is not in the bottom bar. */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between bg-blue-700 px-3 text-white md:hidden">
        <span className="flex items-center gap-2 font-semibold">
          <Snowflake className="h-5 w-5" aria-hidden="true" /> Pleasure Cooling Care
        </span>
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-blue-600" aria-label="Open menu">
              <Menu className="h-6 w-6" aria-hidden="true" />
              {moreCount > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-blue-700" />}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 max-w-[85vw] p-0">
            <SheetTitle className="flex h-12 items-center bg-blue-700 px-4 text-base text-white">Menu</SheetTitle>
            <nav className="space-y-1 p-3">
              {secondary.map((item) => (
                <SheetClose asChild key={item.href}>
                  <SidebarLink item={item} active={isActivePath(pathname, item.href)} badges={badges} />
                </SheetClose>
              ))}
              <button onClick={logout} className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <LogOut className="h-5 w-5" aria-hidden="true" /> Log out
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      <main className="admin-main mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-3 pb-24 pt-3 md:px-6 md:pb-10 md:pt-5">{children}</main>

      {/* Phone: the five things used all day. */}
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="flex">
          {primary.map((item) => {
            const active = isActivePath(pathname, item.href);
            const count = item.badge && badges ? badges[item.badge] : 0;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-blue-700" : "text-slate-500"}`}
                >
                  <span className="relative">
                    <item.Icon className="h-6 w-6" aria-hidden="true" />
                    {count > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-[18px] text-white" aria-label={`${count} waiting`}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
