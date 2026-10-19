import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [
      {
        // Портреты по умолчанию лежат по постоянному пути. Месяц кэша,
        // без immutable: файл по тому же адресу могут заменить.
        source: "/character-defaults/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
    ];
  },
};

export default nextConfig;
