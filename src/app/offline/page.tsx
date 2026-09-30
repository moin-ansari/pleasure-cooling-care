import type { Metadata } from "next";

export const metadata: Metadata = { title: "You are offline", robots: { index: false, follow: false } };

// Shown by the service worker when a page cannot be reached. It needs no network to display.
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">No internet connection</h1>
      <p className="text-muted-foreground">Move to a place with better signal and try again. Anything you already sent is safe.</p>
      <a href="" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Try again
      </a>
    </main>
  );
}
