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
};

module.exports = nextConfig;
