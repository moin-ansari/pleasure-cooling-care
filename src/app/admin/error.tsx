"use client";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-sm rounded-xl border bg-white p-6 text-center">
      <h1 className="text-lg font-semibold">This page could not load</h1>
      <p className="mt-1 text-sm text-muted-foreground">Please try again. If it keeps happening, check your internet connection.</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
