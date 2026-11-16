import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads its wasm and data files from its own package directory, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Seeds are read with fs at runtime; the local PGlite directory (data/) must never ship.
  outputFileTracingIncludes: { "/**": ["./seed/*.json"] },
  outputFileTracingExcludes: { "/**": ["./data/**"] },
};

export default nextConfig;
