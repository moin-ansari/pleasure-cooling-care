import React from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

// Marketing teaser only — no codes, tracking or crediting yet. The /refer page is explicit that the
// program is coming soon, so this never over-promises a reward that can't actually be redeemed.
export default function ReferAndEarn() {
  return (
    <section aria-labelledby="refer-heading" className="px-3 py-8 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 px-5 py-8 text-center text-white shadow-sm">
        <Gift className="h-8 w-8 text-yellow-300" aria-hidden="true" />
        <h2 id="refer-heading" className="text-xl font-bold">
          Refer a friend, both of you save
        </h2>
        <p className="max-w-md text-sm text-blue-100">Tell a friend or family member about us. We&apos;re putting the details together — check back soon.</p>
        <Button asChild variant="secondary" className="mt-1">
          <Link href="/refer">Learn more</Link>
        </Button>
      </div>
    </section>
  );
}
