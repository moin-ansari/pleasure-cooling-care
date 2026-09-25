import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/technician", "/api", "/track", "/login", "/signup"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
