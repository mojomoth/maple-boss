import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads its wasm and data files from its own package directory, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Seeds are read with fs at runtime; the local PGlite directory (data/) must never ship.
  outputFileTracingIncludes: { "/**": ["./seed/*.json"] },
  outputFileTracingExcludes: { "/**": ["./data/**"] },
  poweredByHeader: false,
  // Nothing here is meant to be framed (the delete dialog must not be clickjackable).
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};

export default nextConfig;
