import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in Next 14
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hivebuckhead.com",
      },
    ],
  },
};

export default nextConfig;
