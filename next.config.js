/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gruposiete.es',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.gruposiete.es',
        pathname: '/**',
      },
    ],
  },
  // Optimización para producción
  reactStrictMode: true,
  // Configuración de salida para Vercel/Digital Ocean
  output: 'standalone',

  // Headers de seguridad HTTP
  async headers() {
    return [
      {
        // Aplicar headers de seguridad a todas las rutas
        source: '/:path*',
        headers: [
          // Prevenir DNS prefetching no autorizado
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Forzar HTTPS en producción (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevenir MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Política de referrer
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Permisos de APIs del navegador
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // XSS Protection (legacy, pero no hace daño)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
