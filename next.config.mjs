const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
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
