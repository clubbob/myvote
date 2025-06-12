/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // ✅ 드래그 앤 드롭 오류 방지용
  
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

