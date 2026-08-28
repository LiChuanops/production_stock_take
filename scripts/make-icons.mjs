/**
 * 产生包装房 app 的图标,还有选择地点那一页用的三个房的小图。
 *
 * 跟仓库部那支 app 的图标刻意长得不一样(那支是深蓝底、没有字)——
 * 员工手机上两支 app 会并排,图案一样会点错。
 *
 * 跑法:node scripts/make-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

const INK = '#0f172a' // 跟 app header 同一个深蓝
const TEAL = '#0f766e' // 包装房的底色,跟仓库部那支的深蓝分得开
const CHECK = '#22c55e'

/**
 * App 图标:箱子 + 勾,压一行 PACKING。
 * @param {boolean} maskable 安卓会把图标裁成圆形,maskable 版要把图案缩到中间 80% 内
 */
function appIcon(maskable = false) {
  const s = maskable ? 0.7 : 0.86
  const o = (1 - s) / 2
  const vb = 100
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">
  <rect width="${vb}" height="${vb}" rx="${maskable ? 0 : 22}" fill="${TEAL}"/>
  <g transform="translate(${o * vb} ${o * vb}) scale(${s})">
    <g transform="translate(0 -6)">
      <g fill="none" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
        <path d="M16 28 L50 15 L84 28 L84 66 L50 79 L16 66 Z"/>
        <path d="M16 28 L50 41 L84 28"/>
        <path d="M50 41 L50 79"/>
      </g>
      <g transform="translate(76 64)">
        <circle r="18" fill="${TEAL}"/>
        <circle r="14" fill="${CHECK}"/>
        <path d="M-6.5 0 L-1.5 5 L6.5 -5" fill="none" stroke="#ffffff" stroke-width="4.5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g>
    <text x="50" y="98" font-family="Arial, Helvetica, sans-serif" font-size="13"
          font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">PACKING</text>
  </g>
</svg>`
}

/**
 * 选择地点那一页的房间小图:一个圆角方块加房号。
 * 每个房一个颜色,戴手套的时候用颜色认比用字快。
 */
function roomTile(label, color) {
  // 字多的话缩小一点,免得撑出方块
  const size = label.length <= 3 ? 30 : 25
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="24" fill="${color}"/>
  <text x="50" y="${50 + size / 3}" font-family="Arial, Helvetica, sans-serif" font-size="${size}"
        font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${label}</text>
</svg>`
}

const ROOM_TILES = [
  ['cr3.png', 'CR3', '#0ea5e9'],
  ['cr3t.png', 'CR3T', '#a855f7'],
  ['cr5c.png', 'CR5c', '#f59e0b'],
]

async function svgToPng(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer()
}

async function main() {
  mkdirSync(outDir, { recursive: true })

  writeFileSync(join(outDir, 'icon-192.png'), await svgToPng(appIcon(false), 192))
  writeFileSync(join(outDir, 'icon-512.png'), await svgToPng(appIcon(false), 512))
  writeFileSync(join(outDir, 'icon-maskable.png'), await svgToPng(appIcon(true), 512))

  for (const [file, label, color] of ROOM_TILES) {
    writeFileSync(join(outDir, file), await svgToPng(roomTile(label, color), 144))
  }

  console.log(`图标已写进 ${outDir}`)
}

await main()
