import { MoveRight } from 'lucide-react';
import React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RiToolsFill } from "react-icons/ri";
import { LuSprayCan } from "react-icons/lu";
import { MdOutlineGasMeter } from "react-icons/md";
import { GiComputerFan } from "react-icons/gi";4

const HeroSection = () => {
  return (
    <div className="bg-blue-800 py-5 px-3 text-center relative">
      <h1 className="text-4xl text-white font-bold mt-8 mb-8">You need a AC service</h1>
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
                <div className='tracking-wide'>Gas leak/Refill</div>
            </div>
            <div className="flex flex-col items-center">
                <GiComputerFan className="h-6 w-6 text-yellow-300"/>
                <div className='tracking-wide'>Install/ Uninstall</div>
            </div>
    
        </div>
      {/* <div className="flex items-center gap-1">
        <div className="w-32 h-[100px] p-3 border-2 border-white rounded-md shadow-md relative flex items-center">
          <h2 className="text-sm font-medium mb-2">Book AC expert now</h2>
        </div>
        <MoveRight className="text-white"/>
        <div className="w-32 h-[100px] p-3 border-2 border-white rounded-md shadow-md relative flex items-center">
          <h2 className="text-sm font-medium mb-2">Get Service done at Home</h2>
        </div>
        <MoveRight className="text-white"/>
        <div className="w-32 h-[100px] p-3 border-2 border-white rounded-md shadow-md relative flex items-center">
          <h2 className="text-sm font-medium mb-2">Enjoy the summer</h2>
        </div>
      </div> */}
      <div className="flex mt-4 gap-4 justify-between">
        <Button variant={"secondary"} className="w-1/2"><Link href="#contact">Contact Me</Link></Button>
        <Button variant={"default"} className="w-1/2" asChild>
          <Link href="#bookingForm">Book a Service Now</Link>
        </Button>
      </div>
    </div>
  );
};

export default HeroSection;
