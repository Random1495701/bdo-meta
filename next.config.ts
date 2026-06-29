import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the preview panel to access the dev server without cross-origin warnings
  allowedDevOrigins: [
    "*.space-z.ai",
    "*.z.ai",
  ],
};

export default nextConfig;
