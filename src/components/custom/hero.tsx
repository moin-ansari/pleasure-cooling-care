import React from 'react';
import Link from "next/link";
import StorefrontTopBar from "@/components/custom/StorefrontTopBar";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

const SNOWFLAKE_COUNT = 55;
const snowflakes = Array.from({ length: SNOWFLAKE_COUNT }, (_, i) => {
  const left = (i * 137.5) % 100; // golden-angle spread = even, non-repeating coverage
  const size = 4 + ((i * 7) % 9); // 4-12px
  const duration = 7 + ((i * 5) % 9); // 7-15s, falling
  const delay = -((i * 1.7) % duration); // negative delay staggers flakes mid-fall on load
  const swayDuration = 2.5 + ((i * 3) % 3); // 2.5-5.5s, side-to-side
  const opacity = 0.15 + (((i * 11) % 45) / 225); // 0.15-0.35, subtle so it doesn't compete with the text
  return { left, size, duration, delay, swayDuration, opacity };
});

// Short, app-shell hero: the location/time strip up top, then one compact line of promo copy —
// everything else (appliance picker, contact/book buttons) now lives in the tile grid and bottom nav.
const HeroSection = ({ areas = [] }: { areas?: ServiceAreaItem[] }) => {
  return (
    <div className="relative flex min-h-[33vh] flex-col overflow-hidden bg-gradient-to-b from-sky-200 via-sky-400 to-blue-500">
      <div className="snowfall-layer" aria-hidden="true">
        {snowflakes.map((flake, i) => (
          <span
            key={i}
            className="snowflake"
            style={{
              left: `${flake.left}%`,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              "--fall-duration": `${flake.duration}s`,
              "--fall-delay": `${flake.delay}s`,
              "--sway-duration": `${flake.swayDuration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-1 flex-col justify-between">
        <StorefrontTopBar areas={areas} />
        <div className="px-3 pb-6 pt-4 sm:px-6">
          <h1 className="text-lg font-bold text-white">Home appliance repair, at your doorstep</h1>
          <p className="mt-0.5 text-sm text-blue-50">AC, refrigerator, washing machine &amp; geyser — book online, pay after the work is done.</p>
          <Link href="#services" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white underline-offset-4 hover:underline">
            Book now <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
