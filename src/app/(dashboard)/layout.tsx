import type { Metadata } from "next";
import UserHeader from "@/components/custom/userHeader";

export const metadata: Metadata = {
  title: "Pleasure Cooling Care",
  description: "Ac Technician",
};

export default function Dashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <div>
      <UserHeader />
      {children}
    </div>
  );
}
