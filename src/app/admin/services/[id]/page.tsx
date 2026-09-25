"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ServiceForm from "@/components/custom/admin/serviceForm";
import Loading from "@/components/custom/loading";
import type { ServiceItem } from "@/types/service";

export default function EditServicePage({ params }: { params: { id: string } }) {
  const [service, setService] = useState<ServiceItem | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/services/${params.id}`);
        const json = await res.json();
        if (json.status === "success") setService(json.data);
        else toast.error(json.message || "Could not load service");
      } catch {
        toast.error("Could not load service");
      }
    };
    load();
  }, [params.id]);

  if (!service) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <Loading label="Please Wait..." />
      </div>
    );
  }

  return <ServiceForm service={service} />;
}
