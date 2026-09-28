import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // @ts-ignore - Propiedad requerida por Next.js para permitir acceso desde otras IPs en desarrollo
  allowedDevOrigins: ['127.0.0.1', 'localhost', '10.10.42.2', '192.168.0.0/16', '10.0.0.0/8'],
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/.gemini/**',
          '**/.agent/**',
          '**/.codex/**',
          '**/openspec/**',
          '**/*.log',
          '**/System Volume Information/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
