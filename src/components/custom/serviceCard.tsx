import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { ServiceItem } from "@/types/service";

const FALLBACK_IMAGE = "/service_half1.jpeg";

interface ServiceGroup {
  key: string;
  category: ServiceItem["applianceCategory"];
  serviceType: string;
  subTypes: string[];
  price: number;
  image: string | null;
  desc: string[];
}

// Types of the same appliance sharing a service, price and description show as one card ("Split / Window").
function groupServices(services: ServiceItem[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const s of services) {
    const key = [s.applianceCategory, s.serviceType, s.price, s.image ?? "", s.desc.join("|")].join("::");
    const existing = groups.get(key);
    if (existing) {
      existing.subTypes.push(s.applianceSubType);
    } else {
      groups.set(key, {
        key,
        category: s.applianceCategory,
        serviceType: s.serviceType,
        subTypes: [s.applianceSubType],
        price: s.price,
        image: s.image,
        desc: s.desc,
      });
    }
  }
  return Array.from(groups.values());
}

const ServiceCard = ({ services }: { services: ServiceItem[] }) => {
  const groups = groupServices(services);
  const showCategory = new Set(groups.map((g) => g.category)).size > 1;

  if (groups.length === 0) {
    return (
      <div className="w-full h-40 flex justify-center items-center text-muted-foreground">
        Services will be listed here soon.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 justify-center items-center p-0 w-full md:w-1/2 md:m-auto">
        {groups.map((element) => (
          <Card
            key={element.key}
            className="flex sm:col-span-2 md:col-span-1 lg:col-span-1 md:h-full"
          >
            <CardContent className="w-full p-3">
              <div className="flex justify-between w-full">
                <CardHeader className="p-0 pr-3 w-3/5">
                  {showCategory && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {CATEGORY_LABELS[element.category]}
                    </span>
                  )}
                  <CardTitle className="text-sm tracking-normal">
                    <span>{element.serviceType} </span>
                    <span className="text-xs">({element.subTypes.join(" / ")})</span>
                  </CardTitle>
                  <div className="leading-relaxed">
                    <div className="pb-3">
                      <span className="font-semibold text-sm tracking-normal">Price : </span>
                      <span className="text-sm text-green-500 font-semibold tracking-normal">₹ {element.price}</span>
                    </div>
                    <Separator />
                    <ul className="list-disc p-3 pr-0 text-[10px] italic">
                      {element.desc.map((el, index) => (
                        <li key={index}>{el}</li>
                      ))}
                    </ul>
                  </div>
                </CardHeader>
                <div className="w-2/5 rounded overflow-hidden flex flex-col h-full">
                  <Image
                    width={100}
                    height={100}
                    className="w-full rounded"
                    src={element.image || FALLBACK_IMAGE}
                    alt={`${element.serviceType} service`}
                  />
                  <div className="py-3">
                    <Button variant={"default"} className="h-8 w-full" asChild>
                      <Link href="#bookingForm">Book Request</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServiceCard;
