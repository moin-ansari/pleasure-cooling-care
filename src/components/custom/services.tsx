import Image from "next/image";
import React from "react";

const Services = ({ services }: any) => {
  return (
    <div className="py-6 px-3 bg-primary flex justify-between">
      <div>
        <p className="text-lg font-semibold mb-1 text-primary-foreground">
          Services:
        </p>
        <ul className="list-disc list-inside">
          {services.map((service: any, index: any) => (
            <li key={index} className="text-primary-foreground">
              {service}
            </li>
          ))}
        </ul>
      </div>
      <div className="max-w-sm rounded overflow-hidden shadow-lg flex">
        <Image width={136} height={100} src="/ac_repair.jpg" alt="prototype" />
      </div>
    </div>
  );
};

export default Services;
