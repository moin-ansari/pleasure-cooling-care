import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-sm rounded-xl border bg-white p-6 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <Button asChild className="mt-4">
        <Link href="/admin/dashboard">Go to Home</Link>
      </Button>
    </div>
  );
}
