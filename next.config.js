/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hivebuckhead.com",
      },
    ],
  },
};

module.exports = nextConfig;
