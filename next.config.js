/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For CSV uploads
    },
  },
  images: {
    domains: ['api.mapbox.com'], // For static map images
  },
}

module.exports = nextConfig
