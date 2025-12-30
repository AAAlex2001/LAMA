import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'https://lamaplanner.com/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
