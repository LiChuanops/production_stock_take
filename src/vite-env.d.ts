/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** 建置时间戳,由 vite.config.ts 的 define 注入。用来确认设备上跑的是哪一版。 */
declare const __BUILD_ID__: string

interface Window {
  /** main.tsx 挂载成功后设成 true,index.html 的看门狗靠这个判断有没有白屏 */
  __APP_BOOTED__?: boolean
}
