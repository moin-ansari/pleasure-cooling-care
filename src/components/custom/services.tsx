import React from "react";
import ServiceCard from "./serviceCard";
import type { ServiceItem } from "@/types/service";

const Services = ({ services }: { id?: string; services: ServiceItem[] }) => {
  return (
    <div className="py-6 px-3 flex justify-between w-full">
      <div className="w-full">
        <h2 className="text-3xl font-bold text-primary text-center mb-8">
          Services
        </h2>
        <ServiceCard services={services} />
      </div>
    </div>
  );
};

export default Services;
