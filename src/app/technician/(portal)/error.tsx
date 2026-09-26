"use client";
import { Button } from "@/components/ui/button";

export default function TechnicianError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border bg-background p-6 text-center">
      <h1 className="text-lg font-semibold">This screen could not load</h1>
      <p className="mt-1 text-sm text-muted-foreground">Check your signal and try again.</p>
      <Button className="mt-4 h-12 w-full" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
