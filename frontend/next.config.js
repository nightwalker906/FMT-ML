const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    // Use Next's default dev directory, but isolate production builds to avoid build/dev collisions.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-build',
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
  }

  return nextConfig
}
