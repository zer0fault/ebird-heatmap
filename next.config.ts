import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly set the Turbopack root to this package's directory.
  // Without this, Next.js detects multiple lockfiles across the parent
  // Dev/ monorepo and warns about an ambiguous workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
