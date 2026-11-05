import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // page text for long slide decks is sent to a server action in one batch
    serverActions: { bodySizeLimit: "10mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
