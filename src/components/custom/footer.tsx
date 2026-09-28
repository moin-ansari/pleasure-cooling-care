import React from "react";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import { MdCall, MdEmail, MdWhatsapp } from "react-icons/md";
import { BUSINESS } from "@/constants/business";

const address = `${BUSINESS.address.locality}, ${BUSINESS.address.region}, India ${BUSINESS.address.postalCode}`;

const SOCIALS = [
  { key: "instagram", href: BUSINESS.socials.instagram, label: "Instagram", Icon: FaInstagram },
  { key: "facebook", href: BUSINESS.socials.facebook, label: "Facebook", Icon: FaFacebook },
  { key: "youtube", href: BUSINESS.socials.youtube, label: "YouTube", Icon: FaYoutube },
].filter((s) => s.href);

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-200">{title}</p>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}

const Footer: React.FC = () => {
  return (
    <footer className="bg-blue-900 text-sm text-blue-50">
      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:grid-cols-3">
        <Column title="Company">
          <Link href="/about" className="hover:underline">About us</Link>
          <Link href="/terms" className="hover:underline">Terms &amp; conditions</Link>
          <Link href="/privacy" className="hover:underline">Privacy policy</Link>
          <Link href="/guarantee-terms" className="hover:underline">Guarantee terms</Link>
        </Column>

        <Column title="For customers">
          <Link href="/track" className="hover:underline">Track booking</Link>
          <Link href="/refer" className="hover:underline">Refer and earn</Link>
          <Link href="/home#services" className="hover:underline">Our services</Link>
        </Column>

        <Column title="Contact us">
          <a href={`tel:+91${BUSINESS.phone}`} className="flex items-center gap-2 hover:underline">
            <MdCall className="h-4 w-4 shrink-0" aria-hidden="true" /> {BUSINESS.phone}
          </a>
          <a href={`https://wa.me/91${BUSINESS.whatsapp}`} className="flex items-center gap-2 hover:underline">
            <MdWhatsapp className="h-4 w-4 shrink-0" aria-hidden="true" /> WhatsApp us
          </a>
          <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-2 hover:underline break-all">
            <MdEmail className="h-4 w-4 shrink-0" aria-hidden="true" /> {BUSINESS.email}
          </a>
          <p className="text-blue-200">{address}</p>
        </Column>
      </div>

      {SOCIALS.length > 0 && (
        <div className="flex justify-center gap-4 border-t border-blue-800 py-4">
          {SOCIALS.map(({ key, href, label, Icon }) => (
            <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-blue-200 hover:text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}

      <div className="border-t border-blue-800 px-4 py-4 text-center text-xs text-blue-200">
        &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
