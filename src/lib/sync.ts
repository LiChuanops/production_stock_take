import { APPS_SCRIPT_URL, REQUEST_TIMEOUT_MS, RETRY_BACKOFF_MS, SYNC_POLL_MS } from './config'
import { outboxStore } from './db'
import { createEmitter } from './emitter'
import type { Batch } from './types'

/**
 * 出货队列(outbox)。
 *
 * 规则只有一条:盘点资料一旦写进本机就算保存成功,之后由这支引擎负责送出去。
 * 送不出去就排队重试,永远不会因为网络问题而丢资料。
 *
 * 「保存两次」是靠 batchId 根治的:
 *   1. 同一批资料不管重送几次,batchId 都一样;
 *   2. Apps Script 端用 LockService + 已处理清单去重,同一个 batchId 只写一次;
 *   3. 这支引擎有 inFlight 锁,同一时间只会有一个送出流程在跑。
 */

const DONE_RETENTION_MS = 3 * 24 * 60 * 60 * 1000

export interface SyncState {
  /** 还没送出去的批次(含等待重试的) */
  pending: Batch[]
  /** 已经成功送出、保留着给使用者核对的 */
  done: Batch[]
  syncing: boolean
  lastSuccessAt?: number
  online: boolean
}

const emptyState: SyncState = { pending: [], done: [], syncing: false, online: true }

class SyncEngine {
  private inFlight = false
  private started = false
  private snapshot: SyncState = emptyState
  private poll: ReturnType<typeof setInterval> | null = null
  readonly events = createEmitter()

  getSnapshot = (): SyncState => this.snapshot

  subscribe = (fn: () => void) => this.events.subscribe(fn)

  async start() {
    if (this.started) return
    this.started = true

    // 上次 app 被杀掉时可能有批次卡在 syncing。放回队列重送 ——
    // 就算它其实已经送到了,batchId 会让后端忽略第二次。
    const all = await outboxStore.getAll()
    for (const b of all) {
      if (b.status === 'syncing') {
        await outboxStore.put({ ...b, status: 'pending', nextAttemptAt: 0 })
      }
    }
    await this.prune()
    await this.refresh()

    window.addEventListener('online', this.onOnline)
    window.addEventListener('offline', this.onOffline)
    document.addEventListener('visibilitychange', this.onVisible)
    this.poll = setInterval(() => void this.run(), SYNC_POLL_MS)
    void this.run()
  }

  stop() {
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('offline', this.onOffline)
    document.removeEventListener('visibilitychange', this.onVisible)
    if (this.poll) clearInterval(this.poll)
    this.poll = null
    this.started = false
  }

  private onOnline = () => {
    void this.refresh()
    void this.run()
  }

  private onOffline = () => {
    void this.refresh()
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') void this.run()
  }

  /** 把一批资料放进队列。回传后就可以告诉使用者「已保存」。 */
  async enqueue(batch: Batch) {
    await outboxStore.put(batch)
    await this.refresh()
    void this.run()
  }

  /** 使用者按「立即重试」。清掉退避时间,马上再试一次。 */
  async retryNow(batchId?: string) {
    const all = await outboxStore.getAll()
    for (const b of all) {
      if (b.status === 'done') continue
      if (batchId && b.batchId !== batchId) continue
      await outboxStore.put({ ...b, nextAttemptAt: 0, status: 'pending' })
    }
    await this.refresh()
    void this.run()
  }

  /** 使用者确认放弃某一批(例如已经手动补进表格了)。 */
  async discard(batchId: string) {
    await outboxStore.delete(batchId)
    await this.refresh()
  }

  private async prune() {
    const cutoff = Date.now() - DONE_RETENTION_MS
    const all = await outboxStore.getAll()
    for (const b of all) {
      if (b.status === 'done' && (b.syncedAt ?? b.createdAt) < cutoff) {
        await outboxStore.delete(b.batchId)
      }
    }
  }

  private async refresh() {
    const all = await outboxStore.getAll()
    const pending = all.filter((b) => b.status !== 'done').sort((a, b) => a.createdAt - b.createdAt)
    const done = all.filter((b) => b.status === 'done').sort((a, b) => (b.syncedAt ?? 0) - (a.syncedAt ?? 0))
    this.snapshot = {
      pending,
      done,
      syncing: this.inFlight,
      lastSuccessAt: done[0]?.syncedAt,
      online: navigator.onLine,
    }
    this.events.emit()
  }

  private async run() {
    if (this.inFlight) return
    if (!navigator.onLine) {
      await this.refresh()
      return
    }

    const all = await outboxStore.getAll()
    const due = all
      .filter((b) => b.status !== 'done' && b.nextAttemptAt <= Date.now())
      .sort((a, b) => a.createdAt - b.createdAt)
    if (due.length === 0) {
      await this.refresh()
      return
    }

    this.inFlight = true
    await this.refresh()
    try {
      for (const batch of due) {
        // 中途断网就停手,剩下的等下一轮
        if (!navigator.onLine) break
        await this.send(batch)
      }
    } finally {
      this.inFlight = false
      await this.prune()
      await this.refresh()
    }
  }

  private async send(batch: Batch) {
    const attempts = batch.attempts + 1
    await outboxStore.put({ ...batch, status: 'syncing', attempts })
    await this.refresh()

    try {
      await postBatch(batch)
      await outboxStore.put({
        ...batch,
        attempts,
        status: 'done',
        syncedAt: Date.now(),
        lastError: undefined,
      })
    } catch (err) {
      const idx = Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)
      const base = RETRY_BACKOFF_MS[idx]
      const wait = base + Math.floor(Math.random() * base * 0.25)
      await outboxStore.put({
        ...batch,
        attempts,
        status: 'failed',
        lastError: describeError(err),
        nextAttemptAt: Date.now() + wait,
      })
    }
  }
}

/**
 * 送一批到 Apps Script。
 *
 * ⚠️ 不要加 Content-Type 标头。加了会触发 CORS preflight(OPTIONS),
 *    而 Apps Script 的 /exec 不会回应 OPTIONS,整个请求就会失败。
 *    不加的话浏览器视为 text/plain 的简单请求,可以直接过。
 */
async function postBatch(batch: Batch): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        batchId: batch.batchId,
        sheetName: batch.sheetName,
        rows: batch.rows,
      }),
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!res.ok) throw new HttpError(res.status)

    const text = await res.text()
    let json: AppsScriptReply | null = null
    try {
      json = JSON.parse(text) as AppsScriptReply
    } catch {
      // Apps Script 权限设错的话会回一整页 HTML 登入页,而且状态码是 200。
      // 旧版就是在这里把失败误判成成功的。
      throw new Error('Apps Script 回应的不是 JSON,部署权限可能不是「任何人」 / Apps Script did not return JSON — the deployment may not be set to "Anyone"')
    }

    if (!json || json.success !== true) {
      throw new Error(json?.error || 'Apps Script 回报失败,但没有说原因 / Apps Script reported a failure with no reason')
    }
  } finally {
    clearTimeout(timer)
  }
}

interface AppsScriptReply {
  success?: boolean
  error?: string
  /** 后端认出这个 batchId 已经写过了,回 true。对我们来说一样算成功。 */
  duplicate?: boolean
}

class HttpError extends Error {
  constructor(public status: number) {
    super(`服务器回应 HTTP ${status} / Server returned HTTP ${status}`)
  }
}

function describeError(err: unknown): string {
  if (err instanceof HttpError) {
    if (err.status >= 500) return `Google 服务器暂时出问题 / Google server error (HTTP ${err.status})`
    return `请求被拒绝 / Request rejected (HTTP ${err.status})`
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return `等了 ${Math.round(REQUEST_TIMEOUT_MS / 1000)} 秒,Google 那边没有回应 / No response from Google after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s`
  }
  if (err instanceof TypeError) return '送不出去,连不上网络 / Could not reach the network'
  if (err instanceof Error) return err.message
  return String(err)
}

export const syncEngine = new SyncEngine()
