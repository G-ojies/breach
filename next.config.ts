import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (stray lockfiles exist in the parent dir).
  turbopack: {
    root: __dirname,
  },
  // Load the 0G storage SDK at runtime (it has an optional fs path) instead of
  // bundling it into the serverless function.
  serverExternalPackages: ["@0gfoundation/0g-storage-ts-sdk"],
};

export default nextConfig;
