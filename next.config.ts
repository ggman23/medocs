import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained server bundle for easy Docker deployment.
  output: "standalone",
  // better-sqlite3 is a native module; keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
