import type { NextConfig } from "next"

const config: NextConfig = {
  transpilePackages: ["@buildos/db", "@buildos/types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.cloudflare.com" },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
}

export default config
