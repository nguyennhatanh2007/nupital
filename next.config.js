/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [45, 75, 85, 90, 95],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
