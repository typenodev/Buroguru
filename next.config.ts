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
  // 瘦身：不要把 sharp / libvips 等原生二进制打包进 server handler
  // （Netlify 图片走 /.netlify/images CDN，不需要 Next 自带的 sharp 优化器）
  outputFileTracingExcludes: {
    '*': [
      'node_modules/sharp/**',
      'node_modules/@img/**',
      'node_modules/next/dist/compiled/@ampproject/**',
      '.next/cache/**',
      // 关键：文章原图走 Netlify Image CDN，不要被 trace 进 server handler
      'public/**',
      // 注意：content/ 不能排除！/posts 是动态渲染，运行时要用 fs 读 content/posts/*.md
    ],
  },
}

export default nextConfig;
