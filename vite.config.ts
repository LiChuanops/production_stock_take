import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base 用相对路径:不管这个 repo 叫什么名字、部署在 GitHub Pages 的哪个子路径,
// 都不需要改这个档案。HashRouter 负责路由,所以也不会有 404 问题。
const BUILD_ID = new Date().toISOString().slice(0, 16).replace('T', ' ') + " UTC"

export default defineConfig({
  base: './',
  // 注入建置时间,画面上看得到设备跑的是哪一版
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Packing Room Stock Take',
        short_name: 'Packing',
        description: '包装房盘点 CR3 / CR3T / CR5c · 离线优先 offline first',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 预缓存带 hash,改了代码自动换新档名 —— 不必再手动改 CACHE_NAME 版本号
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Workbox 只处理 GET。提交用的 POST 永远直连网络,不会被缓存拦截。
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-read',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
