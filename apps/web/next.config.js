/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@movux/env'],
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
