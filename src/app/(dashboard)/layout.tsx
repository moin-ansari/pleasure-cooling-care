import Header from "@/components/custom/header";
import type { Metadata } from "next";
import { useState } from "react";
import UserHeader from "@/components/custom/userHeader";
import { GetUser } from "@/actions/auth";

export const metadata: Metadata = {
  title: "AC Expert",
  description: "Ac Technician",
};

export default function Dashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = GetUser();

  return (
    <div>
      {user ? <UserHeader /> : <Header />}
      {children}
    </div>
  );
}
