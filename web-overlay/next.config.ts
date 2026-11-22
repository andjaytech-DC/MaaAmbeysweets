import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here (touched to restart the dev server, 7) */
  cacheComponents: true,
  partialPrefetching: true,
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
