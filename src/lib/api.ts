import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

/**
 * 直接打 Supabase 的 REST 介面,不用 supabase-js。
 *
 * 这支 app 只需要「读一份产品清单」一件事(员工名单是硬代码,不连网),
 * 为此背 145KB(gzip)的 SDK 不划算 —— 冷房用的是便宜安卓机,
 * 每一百 KB 都是开机时间。
 */

const TIMEOUT_MS = 15_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        ...init?.headers,
      },
      signal: controller.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      try {
        const body = JSON.parse(text) as { message?: string; error?: string }
        message = body.message || body.error || message
      } catch {
        /* 回应不是 JSON,就用状态码当讯息 */
      }
      throw new Error(message)
    }
    return (text ? JSON.parse(text) : null) as T
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('连线逾时,网络太慢 / Connection timed out')
    }
    if (err instanceof TypeError) throw new Error('连不上资料库 / Cannot reach the database')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** PostgREST 的 GET。参数直接照 PostgREST 的语法写,例如 { list_key: 'eq.cr2-stock-take' }。 */
export function pgSelect<T>(table: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  return request<T>(`/rest/v1/${table}?${qs}`)
}
