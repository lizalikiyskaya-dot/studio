import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // По умолчанию и так true. Явно: HTML, CSS и JS, которые отдаёт сам Next,
  // ужимаются gzip, если браузер прислал Accept-Encoding. Это не заменяет
  // правку nginx: файл больше одного TLS-записи (~16 КБ уже после gzip)
  // на части сетей всё равно может зависнуть. См. deploy/nginx-tls-stall.conf.
  compress: true,
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
