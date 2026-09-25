"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import TechnicianForm from "@/components/custom/admin/technicianForm";
import Loading from "@/components/custom/loading";
import type { TechnicianDetail } from "@/lib/domain/technicians";

export default function EditTechnicianPage({ params }: { params: { id: string } }) {
  const [technician, setTechnician] = useState<TechnicianDetail | null>(null);

  useEffect(() => {
    fetch(`/api/admin/technicians/${params.id}`)
      .then((r) => r.json())
      .then((json) => (json.status === "success" ? setTechnician(json.data) : toast.error(json.message || "Could not load technician")))
      .catch(() => toast.error("Could not load technician"));
  }, [params.id]);

  if (!technician) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <Loading label="Please Wait..." />
      </div>
    );
  }

  return <TechnicianForm technician={technician} />;
}
