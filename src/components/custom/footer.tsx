import React from "react";
import Link from "next/link";
import { BUSINESS } from "@/constants/business";

const Footer: React.FC = () => {
  return (
    <footer className="text-white bg-blue-800 text-xs">
      <div className="container mx-auto px-10 py-10 grid gap-3 justify-items-center">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href="/about" className="underline-offset-4 hover:underline">About us</Link>
          <Link href="/track" className="underline-offset-4 hover:underline">Track booking</Link>
          <Link href="/guarantee-terms" className="underline-offset-4 hover:underline">Guarantee terms</Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">Terms</Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
          <a href={`tel:+91${BUSINESS.phone}`} className="underline-offset-4 hover:underline">Call {BUSINESS.phone}</a>
        </nav>
        <p className="text-center">&copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
