import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-pg', '@prisma/client', 'prisma'],
  turbopack: {},
};

export default nextConfig;
