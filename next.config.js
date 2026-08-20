/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'pdf-lib'],
  },
};

module.exports = nextConfig;