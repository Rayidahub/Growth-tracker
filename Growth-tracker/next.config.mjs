import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.DISABLE_PWA === 'true',
  swSrc: 'service-worker.js',
  fallbacks: {
    document: '/offline',
  },
  buildExcludes: [/middleware-manifest\.json$/],
})(nextConfig)
