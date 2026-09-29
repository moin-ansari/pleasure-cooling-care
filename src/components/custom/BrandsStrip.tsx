import React from "react";
import { SERVICED_BRANDS } from "@/constants/brands";

export default function BrandsStrip() {
  return (
    <section aria-labelledby="brands-heading" className="px-2 py-8 sm:px-4">
      <h2 id="brands-heading" className="mb-4 text-center text-2xl font-bold text-slate-900">
        We service all major brands
      </h2>
      <ul className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2">
        {SERVICED_BRANDS.map((brand) => (
          <li key={brand} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            {brand}
          </li>
        ))}
      </ul>
    </section>
  );
}
