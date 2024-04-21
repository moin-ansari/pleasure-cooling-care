import Image from "next/image";
import React from "react";
import ServiceCard from "./serviceCard";

const Services = ({ services }: any) => {
  return (
    <div className="py-6 px-3 bg-primary flex justify-between w-full">
      <div className="w-full">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Services
        </h2>
        <ServiceCard />
      </div>
    </div>
  );
};

export default Services;
