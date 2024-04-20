import Header from "@/components/custom/admin/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin Dashboard",
};

export default function Admin({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <div>
      <Header/>
      {children}
    </div>
  );
}
