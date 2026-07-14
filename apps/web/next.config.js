/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@movux/env'],
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      // /admin is a synonym for the regular app — admin role lives inside the
      // same routes (no separate namespace). Redirecting keeps any old/typed
      // /admin/* URL working instead of falling through to 404.
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/:path*',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
