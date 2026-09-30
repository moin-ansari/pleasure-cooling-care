import type { Metadata } from "next";
import AdminShell from "@/components/custom/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default function Admin({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
