"use client";
import Image from "next/image";
import React from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/custom/CartProvider";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { groupServices, groupPriceLabel, strikeoutPrice, type ServiceGroup } from "@/lib/serviceGroups";
import type { ServiceItem } from "@/types/service";

const FALLBACK_IMAGE = "/service_half1.jpeg";

// The owner's stated target rating — a fixed marketing number, independent of `reviewCount` (which is
// the real, live count of published reviews and will keep growing).
const RATING = 4.5;

function addedToast() {
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
}

// A single "Add" button when the group is exactly one service — it adds directly, no picker needed.
// When the group has more than one subtype (so which one to add is a real choice, e.g. AC Uninstall:
// Split vs Window are priced differently), "Add" instead opens the Details page, which has the full
// variant picker — a compact card has no honest way to offer "Split" or "Window" as if they were two
// separate one-tap products.
export function AddToCartButton({ group }: { group: ServiceGroup }) {
  const { addToCart } = useCart();

  if (group.subTypes.length > 1) {
    return (
      <Button asChild variant="default" className="h-7 w-full px-1 text-[10px] sm:h-8 sm:text-xs">
        <Link href={`/services/${group.serviceIds[0]}`}>Add</Link>
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      className="h-7 w-full px-1 text-[10px] sm:h-8 sm:text-xs"
      onClick={() => {
        addToCart(group.serviceIds[0]);
        addedToast();
      }}
    >
      Add
    </Button>
  );
}

// Photo-forward, 2-across cards: image fills the top; below it, a 75/25 split — text info on the left,
// a narrow column with the "Details" link and the small Add control(s) on the right, so the column stays
// the same width and lines up whether a card has one button or several.
const ServiceCard = ({ services, reviewCount }: { services: ServiceItem[]; reviewCount: number }) => {
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

          <div className="flex items-stretch gap-2 p-2.5">
            <div className="min-w-0 flex-1">
              {showCategory && (
                <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
                  {CATEGORY_LABELS[element.category]}
                </span>
              )}
              <p className="text-xs font-semibold leading-tight text-slate-900 sm:text-sm">
                {element.serviceType} <span className="font-normal text-muted-foreground">({element.subTypes.join(" / ")})</span>
              </p>

              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-slate-900 sm:text-base">{groupPriceLabel(element.prices)}</span>
                <span className="text-[10px] font-normal text-muted-foreground line-through sm:text-xs">₹{strikeoutPrice(element.prices)}</span>
              </div>

              {reviewCount > 0 && (
                <div className="mt-0.5 flex items-center gap-1">
                  <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="text-[10px] font-semibold text-slate-700 sm:text-xs">{RATING}</span>
                  <span className="text-[10px] font-normal text-muted-foreground sm:text-xs">
                    ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}

              {element.warrantyDays > 0 && <p className="mt-0.5 text-[10px] font-medium text-emerald-600 sm:text-xs">{element.warrantyDays}-day guarantee</p>}

              {element.desc.length > 0 && (
                <ul className="mt-1 grid gap-0.5">
                  {element.desc.slice(0, 2).map((line) => (
                    <li key={line} className="flex items-start gap-1 text-[10px] font-normal leading-snug text-slate-600 sm:text-xs">
                      <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span className="line-clamp-1">{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex w-1/4 shrink-0 flex-col items-stretch justify-between gap-1">
              <Link href={`/services/${element.serviceIds[0]}`} className="text-center text-[10px] font-semibold text-blue-700 hover:underline sm:text-xs">
                Details <span aria-hidden="true">&rarr;</span>
              </Link>
              <AddToCartButton group={element} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceCard;
