import type { MetadataRoute } from "next";
import { BUSINESS } from "@/constants/business";

// Lets the site be added to a phone's home screen and opened like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BUSINESS.name,
    short_name: "Cooling Care",
    description: "Book AC, refrigerator, washing machine and geyser repair and installation at your home.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Track a booking", url: "/track" },
      { name: "Technician login", url: "/technician" },
    ],
  };
}
