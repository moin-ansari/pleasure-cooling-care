"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StorefrontTopBar from "@/components/custom/StorefrontTopBar";
import type { ApplianceCategoryValue } from "@/constants/appliances";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

interface Slide {
  category: ApplianceCategoryValue;
  image: string;
  headline: string;
  subtext: string;
}

// The photos are all exactly 2000x750 (8:3) — locking the banner to that same ratio means the whole photo
// always shows, full width, with the height following naturally from it (never cropped, never a fixed box).
const IMAGE_RATIO = "aspect-[8/3]";

const SLIDES: Slide[] = [
  { category: "GEYSER", image: "/images/hero/geyser.webp", headline: "Hot water, right on time", subtext: "Geyser repair & installation." },
  { category: "WASHING_MACHINE", image: "/images/hero/washing-machine.webp", headline: "Laundry day, sorted", subtext: "Washing machine repair & installation." },
  { category: "REFRIGERATOR", image: "/images/hero/refrigerator.webp", headline: "Keep it fresh, always", subtext: "Refrigerator repair & installation." },
  { category: "AC", image: "/images/hero/ac.webp", headline: "Beat the heat, stay cool", subtext: "AC repair, service & installation." },
];

const SLIDE_MS = 5000;

// Full-bleed hero: a slowly-rotating carousel of the owner's own appliance photos at their real aspect
// ratio (nothing cropped), no scrim over the image — the photos already leave light, empty copy-space —
// so text sits directly on the photo in blue, matching the brand rather than a white-on-dark overlay.
const HeroSection = ({ areas = [] }: { areas?: ServiceAreaItem[] }) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`relative w-full ${IMAGE_RATIO} overflow-hidden`}>
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.category}
          src={slide.image}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-[1500ms] ease-in-out ${i === active ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      <div className="absolute inset-0 flex flex-col justify-between px-2 py-1.5 sm:px-4 sm:py-3">
        <StorefrontTopBar areas={areas} compact tone="dark" />

        <div>
          {SLIDES.map((slide, i) => (
            <div key={slide.category} className={i === active ? "block" : "hidden"}>
              <h1 className="text-sm font-bold leading-tight text-blue-900 sm:text-2xl">{slide.headline}</h1>
              <p className="text-[11px] leading-tight text-blue-800 sm:mt-1 sm:text-base">{slide.subtext}</p>
            </div>
          ))}
          <Link href="#services" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-900 underline-offset-4 hover:underline sm:mt-2 sm:text-sm">
            Book now <span aria-hidden="true">&rarr;</span>
          </Link>

          <div className="mt-1 flex gap-1 sm:mt-2" role="tablist" aria-label="Hero slides">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.category}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Show ${slide.category.toLowerCase().replace("_", " ")} slide`}
                onClick={() => setActive(i)}
                className={`h-1 rounded-full transition-all ${i === active ? "w-4 bg-blue-900" : "w-1 bg-blue-900/40"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
