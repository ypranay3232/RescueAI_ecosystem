import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack(config) {
    // Three.js / @react-three needs canvas as an optional peer dep
    // Mark it external so webpack doesn't try to bundle a Node canvas
    config.externals = config.externals ?? [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ canvas: "canvas" });
    }
    return config;
  },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
