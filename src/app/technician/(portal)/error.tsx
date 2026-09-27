"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function TechnicianError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
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
