import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@creditmap/types', '@creditmap/utils'],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
