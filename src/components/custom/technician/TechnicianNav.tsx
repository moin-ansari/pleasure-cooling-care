"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdWorkOutline, MdPersonOutline } from "react-icons/md";

const ITEMS = [
  { href: "/technician", label: "Jobs", Icon: MdWorkOutline, match: (p: string) => p === "/technician" || p.startsWith("/technician/jobs") },
  { href: "/technician/profile", label: "Profile", Icon: MdPersonOutline, match: (p: string) => p.startsWith("/technician/profile") },
];

export default function TechnicianNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Technician"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-blue-700" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
