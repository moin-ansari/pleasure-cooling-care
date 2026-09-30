"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import ServiceForm from "@/components/custom/admin/serviceForm";
import { EmptyState, ListSkeleton } from "@/components/custom/admin/ui";
import type { ServiceItem } from "@/types/service";

export default function EditServicePage({ params }: { params: { id: string } }) {
  const [service, setService] = useState<ServiceItem | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/services/${params.id}`)
      .then(async (res) => {
        if (res.status === 404) return setMissing(true);
        const json = await res.json();
        if (json.status === "success") setService(json.data);
        else setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [params.id]);

  if (missing) {
    return (
      <div>
        <EmptyState title="This service was not found" text="It may have been deleted." />
        <p className="mt-3 text-center">
          <Link href="/admin/services" className="text-blue-700 underline">
            Back to services
          </Link>
        </p>
      </div>
    );
  }
  if (!service) return <ListSkeleton rows={3} />;
  return <ServiceForm service={service} />;
}
