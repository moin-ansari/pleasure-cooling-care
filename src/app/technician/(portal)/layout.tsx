import type { Metadata } from "next";
import TechnicianNav from "@/components/custom/technician/TechnicianNav";

export const metadata: Metadata = {
  title: "Technician",
  robots: { index: false, follow: false },
};

export default function TechnicianPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 pb-24">
      <header className="sticky top-0 z-30 border-b bg-blue-800 text-white">
        <div className="mx-auto flex h-14 max-w-md items-center px-4 font-semibold">Pleasure Cooling Care</div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
      <TechnicianNav />
    </div>
  );
}
