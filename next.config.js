/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  // output: 'export', // ❌ 정적 모드 비활성화 (필요 없으면 그대로 두기)
}

module.exports = nextConfig

