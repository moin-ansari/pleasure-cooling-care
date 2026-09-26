"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MapPin, Menu, Snowflake } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminContext, CITY_KEY, readStoredCity, type AdminMe } from "@/components/custom/admin/AdminContext";
import { NAV_ITEMS, isActivePath, type NavItem } from "@/components/custom/admin/nav";
import type { AdminBadges } from "@/lib/domain/adminBadges";

// Every admin request carries the picked city, and an expired login sends the admin back to the login page.
// Installed once, when this file loads, so even the first requests of a page are covered.
if (typeof window !== "undefined" && !(window as unknown as { __pccFetch?: boolean }).__pccFetch) {
  (window as unknown as { __pccFetch?: boolean }).__pccFetch = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    const isAdminApi = url.includes("/api/admin/");
    let nextInit = init;
    if (isAdminApi) {
      const city = readStoredCity();
      if (city) {
        const headers = new Headers(init?.headers);
        headers.set("x-admin-city", city);
        nextInit = { ...init, headers };
      }
    }
    const res = await original(input, nextInit);
    if (res.status === 401 && isAdminApi) window.location.href = "/login?expired=1";
    return res;
  };
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[20px] rounded-full bg-red-600 px-1.5 text-center text-[11px] font-semibold leading-5 text-white" aria-label={`${count} waiting`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

async function logout() {
  try {
    window.localStorage.removeItem(CITY_KEY);
  } catch {
    // ignore
  }
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
  const [me, setMe] = useState<AdminMe | null>(null);
  const [cityId, setCityState] = useState<string | null>(null);

  useEffect(() => {
    setCityState(readStoredCity());
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.status !== "success") return;
        const data: AdminMe = json.data;
        setMe(data);
        // A remembered city that this admin cannot use (for example after a change of store) is dropped.
        const stored = readStoredCity();
        if (stored && !data.cities.some((c) => c.id === stored)) {
          try {
            window.localStorage.removeItem(CITY_KEY);
          } catch {
            // ignore
          }
          setCityState(null);
        }
      })
      .catch(() => undefined);
  }, []);

  const setCityId = useCallback((id: string | null) => {
    try {
      if (id) window.localStorage.setItem(CITY_KEY, id);
      else window.localStorage.removeItem(CITY_KEY);
    } catch {
      // ignore
    }
    // Every screen reads its data again for the new city.
    window.location.reload();
  }, []);

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

  const items = NAV_ITEMS.filter((i) => !i.ownerOnly || !me || me.isOwner);
  const primary = items.filter((i) => i.primary);
  const secondary = items.filter((i) => !i.primary);
  const moreCount = secondary.reduce((n, i) => n + (i.badge && badges ? badges[i.badge] : 0), 0);
  const cityName = cityId ? me?.cities.find((c) => c.id === cityId)?.district : null;

  return (
    <AdminContext.Provider value={{ me, cityId, setCityId }}>
      <div className="min-h-screen bg-slate-50 md:pl-60">
        {/* Laptop and tablet: every destination in the side bar. */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-white md:flex" aria-label="Admin">
          <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold text-blue-800">
            <Snowflake className="h-5 w-5" aria-hidden="true" /> Pleasure Cooling Care
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {items.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} badges={badges} />
            ))}
          </nav>
          <div className="border-t p-3">
            {me && (
              <p className="mb-2 px-3 text-xs text-slate-500">
                {me.name}
                <span className="block font-medium text-slate-700">{me.isOwner ? "Owner" : me.store?.name}</span>
              </p>
            )}
            <button onClick={logout} className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <LogOut className="h-5 w-5" aria-hidden="true" /> Log out
            </button>
          </div>
        </aside>

        {/* Phone: blue title bar with the menu for everything that is not in the bottom bar. */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between bg-blue-700 px-3 text-white md:hidden">
          <span className="flex min-w-0 items-center gap-2 font-semibold">
            <Snowflake className="h-5 w-5 shrink-0" aria-hidden="true" /> <span className="truncate">{me && !me.isOwner ? me.store?.name : "Pleasure Cooling Care"}</span>
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
                {me && (
                  <p className="px-3 pt-2 text-xs text-slate-500">
                    Signed in as {me.name} · {me.isOwner ? "Owner" : "Co-admin"}
                  </p>
                )}
                <button onClick={logout} className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  <LogOut className="h-5 w-5" aria-hidden="true" /> Log out
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        {cityName && (
          <div className="sticky top-12 z-20 flex items-center justify-between gap-2 bg-blue-50 px-3 py-1.5 text-xs text-blue-900 md:top-0 md:px-6">
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Showing {cityName} only
            </span>
            <button onClick={() => setCityId(null)} className="font-semibold underline">
              Show {me?.isOwner ? "all" : "everything"}
            </button>
          </div>
        )}

        <main className="admin-main mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-3 pb-24 pt-3 md:px-6 md:pb-10 md:pt-5">{children}</main>

        {/* Phone: the five things used all day. */}
        <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-40 border-t bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
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
    </AdminContext.Provider>
  );
}
