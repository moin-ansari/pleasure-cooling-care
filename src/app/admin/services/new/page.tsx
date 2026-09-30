"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import ServiceForm from "@/components/custom/admin/serviceForm";
import { ListSkeleton } from "@/components/custom/admin/ui";
import type { ServiceItem } from "@/types/service";

function NewService() {
  const copy = useSearchParams().get("copy");
  const [source, setSource] = useState<ServiceItem | null>(null);
  const [ready, setReady] = useState(!copy);

  useEffect(() => {
    if (!copy) return;
    fetch(`/api/services/${copy}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.status === "success") setSource(json.data);
        else toast.error("Could not find the service to copy");
      })
      .catch(() => toast.error("Could not load the service to copy"))
      .finally(() => setReady(true));
  }, [copy]);

  if (!ready) return <ListSkeleton rows={3} />;
  return <ServiceForm copyOf={source ?? undefined} />;
}

export default function NewServicePage() {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <NewService />
    </Suspense>
  );
}
