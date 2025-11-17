/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gruposiete.es",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.gruposiete.es",
        pathname: "/**",
      },
    ],
  },
  // Optimización para producción
  reactStrictMode: true,
  // Configuración de salida para Vercel/Digital Ocean
  output: "standalone",

  // Headers de seguridad HTTP
  async headers() {
    return [
      {
        // Aplicar headers de seguridad a todas las rutas
        source: "/:path*",
        headers: [
          // Prevenir DNS prefetching no autorizado
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // Forzar HTTPS en producción (HSTS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Prevenir clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevenir MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Política de referrer
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          // Permisos de APIs del navegador
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // XSS Protection (legacy, pero no hace daño)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Content Security Policy (CSP)
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://gruposiete.es https://*.gruposiete.es https://upstash.io https://*.upstash.io; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          },
          // Prevenir apertura de archivos descargados directamente en IE
          {
            key: "X-Download-Options",
            value: "noopen",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
