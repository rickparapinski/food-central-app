import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking runs locally via `npx tsc --noEmit` — skip during build to reduce memory usage on the server
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
