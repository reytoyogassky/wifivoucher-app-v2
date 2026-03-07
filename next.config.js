/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Optimize bundle
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
