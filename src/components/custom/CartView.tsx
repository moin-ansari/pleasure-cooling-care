"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/custom/CartProvider";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { MAX_QTY_PER_LINE, MAX_TOTAL_UNITS } from "@/lib/cart";
import type { ServiceItem } from "@/types/service";

const FALLBACK_IMAGE = "/service_half1.jpeg";

export default function CartView({ services }: { services: ServiceItem[] }) {
  const { lines, setQty, remove, totalCount } = useCart();
  const byId = new Map(services.map((s) => [s.id, s]));

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-3 py-16 text-center">
        <ShoppingCart className="h-10 w-10 text-slate-300" aria-hidden="true" />
        <p className="text-lg font-semibold text-slate-900">Your cart is empty</p>
        <p className="text-sm text-muted-foreground">Add a service to get started.</p>
        <Button asChild className="mt-2">
          <Link href="/home#services">Browse services</Link>
        </Button>
      </div>
    );
  }

  const resolved = lines.map((l) => ({ line: l, service: byId.get(l.serviceId) }));
  const total = resolved.reduce((n, { line, service }) => n + (service ? service.price * line.qty : 0), 0);
  const atCap = totalCount >= MAX_TOTAL_UNITS;

  return (
    <div className="px-3 pb-4 sm:px-6">
      <ul className="grid gap-2.5">
        {resolved.map(({ line, service }) => (
          <li key={line.serviceId} className="flex items-start gap-3 rounded-xl border bg-white p-2.5 shadow-sm">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              <Image src={service?.image || FALLBACK_IMAGE} alt="" fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              {service ? (
                <>
                  <p className="truncate text-sm font-semibold text-slate-900">{service.serviceType}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[service.applianceCategory]}, {service.applianceSubType}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-full border">
                      <button
                        type="button"
                        onClick={() => setQty(line.serviceId, line.qty - 1)}
                        aria-label="Decrease quantity"
                        className="flex h-7 w-7 items-center justify-center text-slate-600"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(line.serviceId, line.qty + 1)}
                        disabled={line.qty >= MAX_QTY_PER_LINE || atCap}
                        aria-label="Increase quantity"
                        className="flex h-7 w-7 items-center justify-center text-slate-600 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">₹{service.price * line.qty}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-amber-700">This service is no longer available.</p>
              )}
            </div>
            <button type="button" onClick={() => remove(line.serviceId)} aria-label="Remove" className="shrink-0 p-1 text-slate-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {atCap && <p className="mt-2 text-xs text-amber-700">An order can have at most {MAX_TOTAL_UNITS} units in total.</p>}

      <div className="mt-4 flex items-center justify-between rounded-xl border bg-white p-3 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-slate-900">₹{total}</p>
        </div>
        {resolved.some((r) => r.service) ? (
          <Button asChild size="lg">
            <Link href="/checkout">Checkout</Link>
          </Button>
        ) : (
          <Button size="lg" disabled>
            Checkout
          </Button>
        )}
      </div>
    </div>
  );
}
