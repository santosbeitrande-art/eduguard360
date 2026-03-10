/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Essencial para Vercel
  images: {
    unoptimized: true, // Se usar imagens locais
  },
  // Se usar rewrites/proxy
  async rewrites() {
    return [];
  },
}
