import type { Metadata } from "next";
import UserHeader from "@/components/custom/userHeader";

export const metadata: Metadata = {
  title: "AC Expert",
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
