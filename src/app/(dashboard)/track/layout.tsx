import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track your booking",
  description: "Check the status of your appliance service booking with your mobile number.",
  robots: { index: false, follow: false },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
