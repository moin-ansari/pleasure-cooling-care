"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MAX_QTY_PER_LINE, readCart, totalUnits, writeCart, type CartLine } from "@/lib/cart";

interface CartContextValue {
  lines: CartLine[];
  addToCart: (serviceId: string, qty?: number) => void;
  setQty: (serviceId: string, qty: number) => void;
  remove: (serviceId: string) => void;
  clear: () => void;
  totalCount: number;
  // False until the first client-side read of localStorage has happened. Anything that redirects away
  // from an "empty cart" (e.g. /checkout) must wait for this, or it will bounce a real cart before it
  // has had a chance to load.
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

// Mounted once in the (dashboard) layout so every public page shares the same cart. Hydrates from
// localStorage after mount (never during render) so the server-rendered HTML and the first client render
// always agree, then keeps localStorage in sync with every change.
export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeCart(lines);
  }, [lines, hydrated]);

  const addToCart = useCallback((serviceId: string, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.serviceId === serviceId);
      if (existing) return prev.map((l) => (l.serviceId === serviceId ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, l.qty + qty) } : l));
      return [...prev, { serviceId, qty: Math.min(MAX_QTY_PER_LINE, qty) }];
    });
  }, []);

  const setQty = useCallback((serviceId: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.serviceId !== serviceId);
      return prev.map((l) => (l.serviceId === serviceId ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, qty) } : l));
    });
  }, []);

  const remove = useCallback((serviceId: string) => {
    setLines((prev) => prev.filter((l) => l.serviceId !== serviceId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  return (
    <CartContext.Provider value={{ lines, addToCart, setQty, remove, clear, totalCount: totalUnits(lines), hydrated }}>{children}</CartContext.Provider>
  );
}
