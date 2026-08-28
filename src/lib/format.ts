import { translate, type Lang } from './i18n'

const pad = (n: number) => n.toString().padStart(2, '0')

/** DD/MM/YYYY —— Google Sheet 那边一直是这个格式,别改。 */
export function formatDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/**
 * h:mm AM/PM ——「一定」要维持这个格式,不可以换成 24 小时制。
 *
 * 这个字串会原样存进 packing_room_stock_take.stock_time,而且 Apps Script 里
 * 有两支函式是照这个格式解析的:
 *   getTimePeriod()  拿空格切出 'AM' / 'PM'  -> stock_time_period
 *   isBeforeNoon()   解析 h:mm 和 AM/PM      -> is_morning_stock
 * 换成 '15:45:30' 的话,切出来是 undefined,上下午分不出来,
 * 包装房那边照上下午看的报表就全断了。
 *
 * (仓库部那支 app 用的是 HH:mm:ss —— 那是另一张表、另一套解析,不要互相参考。)
 */
export function formatTime(d: Date): string {
  const h24 = d.getHours()
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${pad(d.getMinutes())} ${ampm}`
}

export function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${formatTime(d)}`
}

/** 「3 分钟前」这种相对时间,同步状态用。 */
export function relativeTime(ts: number, lang: Lang, now = Date.now()): string {
  const diff = Math.max(0, now - ts)
  const s = Math.floor(diff / 1000)
  if (s < 10) return translate(lang, 'justNow')
  if (s < 60) return translate(lang, 'secAgo', { n: s })
  const m = Math.floor(s / 60)
  if (m < 60) return translate(lang, 'minAgo', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return translate(lang, 'hourAgo', { n: h })
  return translate(lang, 'dayAgo', { n: Math.floor(h / 24) })
}

/** 倒数到下次重试。 */
export function countdown(ts: number, lang: Lang, now = Date.now()): string {
  const s = Math.ceil(Math.max(0, ts - now) / 1000)
  if (s <= 0) return translate(lang, 'retrySoon')
  if (s < 60) return translate(lang, 'retryInSec', { n: s })
  return translate(lang, 'retryInMin', { n: Math.ceil(s / 60) })
}

export function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  // 极旧的 WebView 后备方案
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
