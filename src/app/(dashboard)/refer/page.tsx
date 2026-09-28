import type { Metadata } from "next";
import Link from "next/link";
import { Gift, MessageCircleHeart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/custom/footer";
import { BUSINESS } from "@/constants/business";

export const metadata: Metadata = {
  title: "Refer and earn",
  description: `Refer a friend to ${BUSINESS.name} and both of you save on your next service. The full program is coming soon.`,
  alternates: { canonical: "/refer" },
};

const STEPS = [
  { Icon: MessageCircleHeart, title: "Tell a friend", text: "Share our number with someone who needs an AC, fridge, washing machine or geyser serviced." },
  { Icon: Sparkles, title: "They book with us", text: "They mention you when they call or book, and get their appliance fixed the same way you did." },
  { Icon: Gift, title: "You both save", text: "We're finalising the exact reward and how it's credited. Once it's live, this page will show your personal referral details." },
];

export default function ReferPage() {
  return (
    <div>
      <section className="px-3 py-10 sm:w-1/2 sm:mx-auto sm:py-14">
        <h1 className="mb-2 text-center text-3xl font-bold text-slate-900">Refer and earn</h1>
        <p className="mb-8 text-center text-muted-foreground">
          Refer a friend or family member and you&apos;ll both save on your next service — we&apos;re putting the final details together.
        </p>
        <ul className="grid gap-4">
          {STEPS.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 rounded-lg border bg-background p-4 shadow-sm">
              <Icon className="mt-0.5 h-6 w-6 shrink-0 text-blue-700" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Have a friend who needs us right now? Just have them{" "}
          <a href={`tel:+91${BUSINESS.phone}`} className="text-blue-700 underline">
            call us
          </a>{" "}
          or{" "}
          <Link href="/home#bookingForm" className="text-blue-700 underline">
            book online
          </Link>
          .
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/home">Back to home</Link>
          </Button>
        </div>
      </section>
      <Footer />
    </div>
  );
}
