"use client";
import React, { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/custom/CartProvider";
import type { ServiceGroup } from "@/lib/serviceGroups";

// The details page's real variant picker: one selectable card per subtype with its own price, and a
// single "Add to cart" button that adds whichever one is selected — the full version of the choice a
// compact grid card can't fit (that card just links here instead).
export default function ServiceDetailAddToCart({ group }: { group: ServiceGroup }) {
  const { addToCart } = useCart();
  const [index, setIndex] = useState(0);
  const multi = group.subTypes.length > 1;

  const add = () => {
    addToCart(group.serviceIds[index]);
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

  return (
    <div className="grid gap-3">
      {multi && (
        <div className="grid grid-cols-2 gap-2">
          {group.subTypes.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={index === i}
              className={`rounded-xl border p-3 text-left transition-colors ${
                index === i ? "border-blue-700 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{t}</p>
              <p className="text-sm font-bold text-slate-900">₹{group.prices[i]}</p>
            </button>
          ))}
        </div>
      )}

      <Button size="lg" className="h-12 w-full text-base font-semibold" onClick={add}>
        Add to cart — ₹{group.prices[index]}
      </Button>
    </div>
  );
}
