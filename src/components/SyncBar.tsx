import { Link } from 'react-router-dom'
import { countdown, relativeTime } from '../lib/format'
import { useNow, useSyncState } from '../lib/hooks'
import { useLang } from '../lib/i18n'

/**
 * 永远在最上面的一条同步状态。
 * 旧版最大的问题是「送出去了没有」完全看不见,这条就是为了把它变成随时看得到。
 */
export function SyncBar() {
  const state = useSyncState()
  const now = useNow(5_000)
  const { lang, t } = useLang()

  const pending = state.pending.length
  const entries = state.pending.reduce((sum, b) => sum + b.entryCount, 0)
  const nextAttempt = state.pending.length
    ? Math.min(...state.pending.map((b) => b.nextAttemptAt))
    : 0

  if (pending === 0) {
    return (
      <Link
        to="/sync"
        className={`flex items-center justify-center gap-2 px-3 py-1.5 text-[13px] font-medium ${
          state.online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
        }`}
      >
        <Dot className={state.online ? 'bg-emerald-500' : 'bg-slate-400'} />
        {state.online ? t('barAllSynced') : t('barOfflineIdle')}
        {state.lastSuccessAt ? (
          <span className="opacity-70">
            {t('barLastSync', { t: relativeTime(state.lastSuccessAt, lang, now) })}
          </span>
        ) : null}
      </Link>
    )
  }

  const failed = state.pending.some((b) => b.status === 'failed')
  const tone = !state.online
    ? 'bg-slate-700 text-white'
    : failed
      ? 'bg-rose-600 text-white'
      : 'bg-amber-500 text-white'

  return (
    <Link to="/sync" className={`flex items-center gap-2 px-3 py-2.5 text-[14px] font-semibold ${tone}`}>
      {state.syncing ? <Spinner /> : <Dot className="bg-white/80" />}
      <span className="flex-1 truncate">
        {state.syncing
          ? t('barSyncing', { b: pending, e: entries })
          : !state.online
            ? t('barOfflinePending', { b: pending, e: entries })
            : t('barPending', { b: pending, e: entries, c: countdown(nextAttempt, lang, now) })}
      </span>
      <span className="shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-[12px] font-medium">
        {t('details')}
      </span>
    </Link>
  )
}

function Dot({ className }: { className: string }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`} />
}

function Spinner() {
  return (
    <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
