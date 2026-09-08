/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // 確保靜態文件正確處理
  trailingSlash: false,
  generateEtags: false,
  // sharp 仅在服务端用于读取图片尺寸，交给 Node 直接 require，避免打包原生模块
  serverExternalPackages: ['sharp'],
}

export default nextConfig;
