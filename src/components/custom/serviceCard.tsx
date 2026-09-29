"use client";
import Image from "next/image";
import React, { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  warrantyDays: number;
}

// Types of the same appliance sharing a service, price and warranty show as one card ("Split / Window").
function groupServices(services: ServiceItem[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const s of services) {
    const key = [s.applianceCategory, s.serviceType, s.price, s.image ?? "", s.warrantyDurationDays].join("::");
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
        <Button variant="default" className="h-8 w-full text-xs" onClick={() => add(subIndex)}>
          Add to cart
        </Button>
      </div>
    );
  }

  return (
    <Button variant="default" className="h-8 w-full text-xs" onClick={() => (multi ? setChoosing(true) : add(0))}>
      Add to cart
    </Button>
  );
}

// Photo-forward, 2-across cards: image fills the top, then title/subtype, price and guarantee, with the
// Add-to-cart control pinned to the bottom so every card in a row lines up.
const ServiceCard = ({ services }: { services: ServiceItem[] }) => {
  const groups = groupServices(services);
  const showCategory = new Set(groups.map((g) => g.category)).size > 1;

  if (groups.length === 0) {
    return <div className="flex h-40 w-full items-center justify-center text-muted-foreground">Services will be listed here soon.</div>;
  }

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3">
      {groups.map((element) => (
        <div key={element.key} className="flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="relative aspect-[4/3] w-full bg-slate-100">
            <Image src={element.image || FALLBACK_IMAGE} alt="" fill sizes="(max-width: 640px) 50vw, 300px" className="object-cover" />
          </div>
          <div className="flex flex-1 flex-col gap-1 p-2.5">
            {showCategory && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[element.category]}</span>}
            <p className="text-sm font-semibold leading-tight text-slate-900">
              {element.serviceType} <span className="font-normal text-muted-foreground">({element.subTypes.join(" / ")})</span>
            </p>
            <p className="text-sm font-bold text-slate-900">₹{element.price}</p>
            {element.warrantyDays > 0 && <p className="text-xs text-emerald-600">{element.warrantyDays}-day guarantee</p>}
            <div className="mt-auto pt-2">
              <AddToCartButton group={element} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceCard;
