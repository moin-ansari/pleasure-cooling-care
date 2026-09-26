"use client";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/constants/business";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">This page could not load</h1>
      <p className="text-muted-foreground">Please check your internet connection and try again.</p>
      <Button onClick={reset}>Try again</Button>
      <a href={`tel:+91${BUSINESS.phone}`} className="text-sm text-blue-700 underline">
        Or call us on {BUSINESS.phone}
      </a>
    </main>
  );
}
