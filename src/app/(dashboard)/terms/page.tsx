import type { Metadata } from "next";
import LegalPage from "@/components/custom/LegalPage";
import { TERMS } from "@/constants/legal";

export const metadata: Metadata = {
  title: TERMS.title,
  description: TERMS.description,
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <LegalPage doc={TERMS} />;
}
