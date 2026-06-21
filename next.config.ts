import type { NextConfig } from "next";

// GitHub Pages project site served from https://<user>.github.io/medocs/
// If you rename the repo or use a custom domain, change (or empty) basePath.
const basePath = process.env.PAGES_BASE_PATH ?? "/medocs";

const nextConfig: NextConfig = {
  output: "export", // fully static site (no server) for GitHub Pages
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
