import { withSentryConfig } from "@sentry/nextjs/config";

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// Service images uploaded to Supabase Storage are served from the project's own address.
const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      { source: "/admin/:path*", headers: noindex },
      { source: "/technician/:path*", headers: noindex },
      { source: "/api/:path*", headers: noindex },
      { source: "/login", headers: noindex },

      { source: "/track", headers: noindex },
      { source: "/cart", headers: noindex },
      { source: "/checkout", headers: noindex },
    ];
  },
};

// Uploads source maps to Sentry so stack traces show real file names and line numbers, but only when the
// three SENTRY_* build variables are set. Without them this just returns nextConfig unchanged, silently.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  disableLogger: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
