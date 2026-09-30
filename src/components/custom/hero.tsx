import { MoveRight } from 'lucide-react';
import React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RiToolsFill } from "react-icons/ri";
import { LuSprayCan } from "react-icons/lu";
import { MdOutlineGasMeter } from "react-icons/md";
import { GiComputerFan } from "react-icons/gi";4

const SNOWFLAKE_COUNT = 55;
const snowflakes = Array.from({ length: SNOWFLAKE_COUNT }, (_, i) => {
  const left = (i * 137.5) % 100; // golden-angle spread = even, non-repeating coverage
  const size = 4 + ((i * 7) % 9); // 4-12px
  const duration = 7 + ((i * 5) % 9); // 7-15s, falling
  const delay = -((i * 1.7) % duration); // negative delay staggers flakes mid-fall on load
  const swayDuration = 2.5 + ((i * 3) % 3); // 2.5-5.5s, side-to-side
  const opacity = 0.55 + (((i * 11) % 45) / 100); // 0.55-1
  return { left, size, duration, delay, swayDuration, opacity };
});

const HeroSection = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-sky-400 via-sky-600 to-blue-800">
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
      <div className="relative z-10 py-5 px-3 text-center md:w-1/2 md:m-auto">
        <h1 className="text-4xl text-white font-bold mt-8 mb-8">Do you need a AC Service ?</h1>
        <div className="text-1xl text-white font-medium"><span className="text-2xl">&#x275D;</span> We have 5 years of proven expertise in Air Conditioner solutions. Trust us for top-tier service that keeps you cool <span className="text-2xl">&#x275E;</span></div>
        <Button variant={"link"} className="w-1/2 text-white mb-6" asChild>
            <Link href="#experience" className="text-yellow-300 italic underline underline-offset-8">Click to Read Experience</Link>
          </Button>
        <h4 className="text-1xl text-white font-medium">Providing all services at your doorstep</h4>
          <div className="flex items-center justify-between text-1xl text-white font-medium pt-6 pb-4 gap-2">
              <div className="flex flex-col items-center">
                  <RiToolsFill className="h-6 w-6 text-yellow-300"/>
                  <div className='tracking-wide'>AC Repair</div>
              </div>
              <div className="flex flex-col items-center">
                  <LuSprayCan className="h-6 w-6 text-yellow-300"/>
                  <div className='tracking-wide'>Anti-rust Deep Clean</div>
              </div>
              <div className="flex flex-col items-center">
                  <MdOutlineGasMeter className="h-6 w-6 text-yellow-300"/>
                  <div className='tracking-wide'>Gas leak fix {'&'} Refill</div>
              </div>
              <div className="flex flex-col items-center">
                  <GiComputerFan className="h-6 w-6 text-yellow-300"/>
                  <div className='tracking-wide'>Install {'&'} Uninstall</div>
              </div>
          </div>
        <div className="flex mt-4 gap-4 justify-between">
          <Button variant={"secondary"} className="w-1/2"><Link href="#contact">Contact Me</Link></Button>
          <Button variant={"default"} className="w-1/2" asChild>
            <Link href="#bookingForm">Book a Service Now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
