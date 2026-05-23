import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray ~/pnpm-lock.yaml otherwise makes Next infer
  // the home directory as root (build warning + wrong output file tracing).
  turbopack: { root: process.cwd() },
};

export default nextConfig;
