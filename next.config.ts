import type { NextConfig } from "next";

// GitHub Pages: deployed at https://nothinking.github.io/jiraksil/
// basePath/assetPrefix only applied in production export build
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
