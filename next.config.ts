import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/GPT-Debate-Discuss-Research" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/GPT-Debate-Discuss-Research" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
