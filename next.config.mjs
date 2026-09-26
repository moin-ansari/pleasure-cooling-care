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
      { source: "/admin/:path*", headers: noindex },
      { source: "/technician/:path*", headers: noindex },
      { source: "/api/:path*", headers: noindex },
      { source: "/login", headers: noindex },
      { source: "/signup", headers: noindex },
      { source: "/track", headers: noindex },
    ];
  },
};

export default nextConfig;
