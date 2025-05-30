import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/flamingo-party',
  assetPrefix: '/flamingo-party/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
