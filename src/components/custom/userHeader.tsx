"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTools } from "react-icons/fa";
import { Button } from "@/components/ui/button"

// Pages without their own booking form send visitors to the home page form.
const PAGES_WITHOUT_FORM = ["/track", "/about"];

const UserHeader = () => {
  const pathname = usePathname();
  const bookHref = PAGES_WITHOUT_FORM.includes(pathname) ? "/home#bookingForm" : "#bookingForm";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <nav aria-label="Main" className="font-medium flex flex-row justify-between items-center w-full">
          <div className="flex items-center gap-2 font-semibold text-base">
            <Link
              href="/home"
              className="flex gap-3 items-center"
            >
              <FaTools className="h-6 w-6" aria-hidden="true" />
              <span className="text-sm sm:text-base leading-tight">Pleasure Cooling Care</span>
            </Link>
          </div>
          <div className="flex flex-row items-center gap-2 sm:gap-4">
            <Link href="/about" className="hidden sm:inline text-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline">
              About
            </Link>
            <Link href="/track" className="text-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline">
              Track booking
            </Link>
            <Button asChild variant={'outline'}>
              <Link href={bookHref}>Book Now</Link>
            </Button>
          </div>
        </nav>
      </header>
  );
};

export default UserHeader;
