import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_EXIGENT_FRONTEND_COMMIT: process.env.EXIGENT_FRONTEND_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
