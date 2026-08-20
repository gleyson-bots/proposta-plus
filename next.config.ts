import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /proposta serves the original monolithic index.html at runtime while the
  // modular migration is completed. Keep the canonical engine in the server
  // trace so Vercel cannot deploy the route without the source file.
  outputFileTracingIncludes: {
    "/proposta": ["./index.html"],
  },
};

export default nextConfig;
