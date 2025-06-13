/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  // experimental: {
  //   appDir: true,  // Next.js 14부터 기본 활성화라 필요 없음
  // },
}

module.exports = nextConfig


