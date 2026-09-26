import Link from "next/link";
import { BUSINESS } from "@/constants/business";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-blue-700">404</p>
      <h1 className="text-2xl font-semibold text-gray-800">We could not find that page</h1>
      <p className="text-muted-foreground">The link may be old or mistyped. You can book a service, or check on a booking you already made.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/home" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Go to home
        </Link>
        <Link href="/track" className="rounded-md border px-5 py-2.5 text-sm font-medium">
          Track a booking
        </Link>
      </div>
      <a href={`tel:+91${BUSINESS.phone}`} className="text-sm text-blue-700 underline">
        Call us on {BUSINESS.phone}
      </a>
    </main>
  );
}
