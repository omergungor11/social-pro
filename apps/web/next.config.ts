import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@social-pro/ui", "@social-pro/shared-types"],
};

export default nextConfig;
