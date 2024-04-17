import React from 'react';
import Link from 'next/link';
import { FaTools } from "react-icons/fa";
import { Button } from "@/components/ui/button"

const UserHeader = () => {
  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-6">
        <nav className="font-medium flex flex-row justify-between items-center w-full">
          <div className="flex items-center gap-2 font-semibold text-base">
            <Link
              href="#"
              className="flex gap-3"
            >
              <FaTools className="h-6 w-6" />
              <span className="">AC Expert</span>
            </Link>
          </div>
          <div className="flex flex-row gap-6">
          <Button asChild variant={'outline'}>
            <Link href="/booknow">Book Now</Link>
            </Button>
          </div>
        </nav>
      </header>
  );
};

export default UserHeader;
