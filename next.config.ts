import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost:3000", "dev.boxx.vn"],
};

export default nextConfig;
