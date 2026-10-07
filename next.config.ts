import type { NextConfig } from "next";
import path from "node:path";

const busytexDir = path.join(__dirname, "public/core/busytex");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          busytexDir,
          "**/public/core/busytex/**",
          "**/*.data",
          "**/*.wasm",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
