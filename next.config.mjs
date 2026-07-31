/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/recruiter',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/projects/thesongofmaka',
        destination: '/projects/songofmaka',
        permanent: true,
      },
      {
        source: '/games/thesongofmaka',
        destination: '/projects/songofmaka',
        permanent: true,
      },
      {
        source: '/games/:slug',
        destination: '/projects/:slug',
        permanent: true,
      },
      {
        source: '/design/:slug',
        destination: '/projects/:slug',
        permanent: true,
      },
      {
        source: '/wip/:slug',
        destination: '/projects/:slug',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
