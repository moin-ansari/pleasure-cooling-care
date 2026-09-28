"use client";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/custom/CartProvider";
import { CATEGORY_LABELS } from "@/constants/appliances";
import type { ServiceItem } from "@/types/service";

const FALLBACK_IMAGE = "/service_half1.jpeg";

interface ServiceGroup {
  key: string;
  category: ServiceItem["applianceCategory"];
  serviceType: string;
  subTypes: string[];
  // Same order as subTypes, so picking a subtype resolves to the exact Service row to add to the cart.
  serviceIds: string[];
  price: number;
  image: string | null;
  desc: string[];
  warrantyDays: number;
}

// Types of the same appliance sharing a service, price and description show as one card ("Split / Window").
function groupServices(services: ServiceItem[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const s of services) {
    const key = [s.applianceCategory, s.serviceType, s.price, s.image ?? "", s.desc.join("|"), s.warrantyDurationDays].join("::");
    const existing = groups.get(key);
    if (existing) {
      existing.subTypes.push(s.applianceSubType);
      existing.serviceIds.push(s.id);
    } else {
      groups.set(key, {
        key,
        category: s.applianceCategory,
        serviceType: s.serviceType,
        subTypes: [s.applianceSubType],
        serviceIds: [s.id],
        price: s.price,
        image: s.image,
        desc: s.desc,
        warrantyDays: s.warrantyDurationDays,
      });
    }
  }
  return Array.from(groups.values());
}

function AddToCartButton({ group }: { group: ServiceGroup }) {
  const { addToCart } = useCart();
  const [subIndex, setSubIndex] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const multi = group.subTypes.length > 1;

  const add = (index: number) => {
    addToCart(group.serviceIds[index]);
    setChoosing(false);
    toast.success(
      (t) => (
        <span className="flex items-center gap-3">
          Added to cart
          <Link href="/cart" className="font-semibold text-blue-700 underline" onClick={() => toast.dismiss(t.id)}>
            View cart
          </Link>
        </span>
      ),
      { duration: 3000 }
    );
  };

  if (multi && choosing) {
    return (
      <div className="grid gap-1.5">
        <label htmlFor={`sub-${group.key}`} className="sr-only">
          Choose the type
        </label>
        <select
          id={`sub-${group.key}`}
          className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
          value={subIndex}
          onChange={(e) => setSubIndex(Number(e.target.value))}
        >
          {group.subTypes.map((t, i) => (
            <option key={t} value={i}>
              {t}
            </option>
          ))}
        </select>
        <Button variant="default" className="h-8 w-full" onClick={() => add(subIndex)}>
          Add to cart
        </Button>
      </div>
    );
  }

  return (
    <Button variant="default" className="h-8 w-full" onClick={() => (multi ? setChoosing(true) : add(0))}>
      Add to cart
    </Button>
  );
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
                    {element.warrantyDays > 0 && (
                      <p className="text-xs text-muted-foreground pb-2">{element.warrantyDays}-day guarantee</p>
                    )}
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
                    <AddToCartButton group={element} />
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
