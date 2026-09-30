import type { Metadata } from "next";
import LegalPage from "@/components/custom/LegalPage";
import { GUARANTEE } from "@/constants/legal";

export const metadata: Metadata = {
  title: GUARANTEE.title,
  description: GUARANTEE.description,
  alternates: { canonical: "/guarantee-terms" },
};

export default function Page() {
  return <LegalPage doc={GUARANTEE} />;
}
