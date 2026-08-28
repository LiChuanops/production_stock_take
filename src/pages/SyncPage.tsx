import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Confirm } from '../components/Confirm'
import { LangToggle } from '../components/LangToggle'
import { SyncBar } from '../components/SyncBar'
import { useToast } from '../components/Toast'
import { usingFallback } from '../lib/db'
import { countdown, relativeTime } from '../lib/format'
import { useNow, useSyncState } from '../lib/hooks'
import { useLang, type Lang, type T } from '../lib/i18n'
import { syncEngine } from '../lib/sync'
import type { Batch } from '../lib/types'

/**
 * 同步状态页。
 * 「保存不到」的抱怨有一半是因为看不见发生了什么事,这一页就是要让它无所遁形:
 * 每一批送到哪一步、失败原因是什么、下一次什么时候重试,全部写清楚。
 */
export function SyncPage() {
  const state = useSyncState()
  const now = useNow(1000)
  const toast = useToast()
  const { lang, t } = useLang()
  const [discarding, setDiscarding] = useState<Batch | null>(null)

  return (
    <div className="min-h-dvh bg-slate-100">
      <SyncBar />

      <header className="flex items-center gap-2 bg-slate-900 px-3 py-3 text-white">
        <Link
          to="/"
          aria-label={t('back')}
          className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl leading-none active:bg-white/10"
        >
          ‹
        </Link>
        <div className="min-w-0 flex-1 truncate text-[18px] font-bold">{t('syncTitle')}</div>
        <LangToggle />
      </header>

      <main className="space-y-5 px-3 py-4 pb-10">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <Row label={t('network')} value={state.online ? t('online') : t('offline')} ok={state.online} />
          <Row
            label={t('pendingLabel')}
            value={state.pending.length === 0 ? t('none') : t('nBatches', { n: state.pending.length })}
            ok={state.pending.length === 0}
          />
          <Row
            label={t('lastSuccess')}
            value={state.lastSuccessAt ? relativeTime(state.lastSuccessAt, lang, now) : t('never')}
            ok={Boolean(state.lastSuccessAt)}
          />
          <Row
            label={t('storage')}
            value={usingFallback ? t('storageFallback') : 'IndexedDB'}
            ok={!usingFallback}
          />
          <Row label={t('buildLabel')} value={String(__BUILD_ID__)} ok />
          {usingFallback ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-800">
              {t('fallbackWarning')}
            </p>
          ) : null}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[15px] font-bold text-slate-800">
              {t('pendingHeading', { n: state.pending.length })}
            </h2>
            {state.pending.length > 0 ? (
              <button
                onClick={() => {
                  void syncEngine.retryNow()
                  toast.info(t('requeued'))
                }}
                className="min-h-[36px] rounded-lg bg-slate-900 px-3 text-[14px] font-semibold text-white active:bg-slate-800"
              >
                {t('retryAll')}
              </button>
            ) : null}
          </div>

          {state.pending.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-[15px] text-slate-500">
              {t('allSent')}
            </p>
          ) : (
            <ul className="space-y-2">
              {state.pending.map((b) => (
                <li key={b.batchId} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[16px] font-bold text-slate-900">
                      {t('batchLine', { room: b.roomName, n: b.entryCount })}
                    </span>
                    <StatusChip batch={b} now={now} lang={lang} t={t} />
                  </div>
                  <div className="mt-1 text-[13px] text-slate-500">
                    {b.operator} · {t('savedAt', { t: relativeTime(b.createdAt, lang, now) })}
                    {b.attempts > 0 ? t('attemptsN', { n: b.attempts }) : ''}
                  </div>
                  {b.lastError ? (
                    <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[13px] leading-relaxed text-rose-700">
                      {b.lastError}
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        void syncEngine.retryNow(b.batchId)
                        toast.info(t('retrying'))
                      }}
                      className="min-h-[44px] rounded-lg bg-slate-100 text-[15px] font-semibold text-slate-700 active:bg-slate-200"
                    >
                      {t('retryNow')}
                    </button>
                    <button
                      onClick={() => setDiscarding(b)}
                      className="min-h-[44px] rounded-lg border border-rose-200 text-[15px] font-semibold text-rose-600 active:bg-rose-50"
                    >
                      {t('discardBatch')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 px-1 text-[15px] font-bold text-slate-800">
            {t('doneHeading', { n: state.done.length })}
          </h2>
          {state.done.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-[15px] text-slate-500">
              {t('doneEmpty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {state.done.map((b) => (
                <li
                  key={b.batchId}
                  className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3"
                >
                  <span aria-hidden className="text-[18px] text-emerald-600">
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-slate-900">
                      {t('batchLine', { room: b.roomName, n: b.entryCount })}
                    </div>
                    <div className="text-[13px] text-slate-500">
                      {b.operator} ·{' '}
                      {b.syncedAt ? t('sentAt', { t: relativeTime(b.syncedAt, lang, now) }) : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-slate-500">{t('doneNote')}</p>
        </section>
      </main>

      <Confirm
        open={discarding !== null}
        danger
        title={t('confirmDiscardTitle')}
        body={
          discarding
            ? t('confirmDiscardBody', { room: discarding.roomName, n: discarding.entryCount })
            : undefined
        }
        confirmLabel={t('confirmDiscardOk')}
        onCancel={() => setDiscarding(null)}
        onConfirm={() => {
          if (discarding) {
            void syncEngine.discard(discarding.batchId)
            toast.info(t('discarded'))
          }
          setDiscarding(null)
        }}
      />
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-[15px] text-slate-600">{label}</span>
      <span className={`text-[15px] font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
        {value}
      </span>
    </div>
  )
}

function StatusChip({ batch, now, lang, t }: { batch: Batch; now: number; lang: Lang; t: T }) {
  if (batch.status === 'syncing') {
    return <Chip className="bg-sky-100 text-sky-800">{t('statusSending')}</Chip>
  }
  if (batch.status === 'failed') {
    return (
      <Chip className="bg-rose-100 text-rose-800">{countdown(batch.nextAttemptAt, lang, now)}</Chip>
    )
  }
  return <Chip className="bg-amber-100 text-amber-800">{t('statusQueued')}</Chip>
}

function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12px] font-semibold ${className}`}>
      {children}
    </span>
  )
}
