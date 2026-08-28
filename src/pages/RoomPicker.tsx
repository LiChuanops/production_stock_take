import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LangToggle } from '../components/LangToggle'
import { SyncBar } from '../components/SyncBar'
import { ROOMS, roomLabel } from '../lib/config'
import { useSyncState } from '../lib/hooks'
import { useLang } from '../lib/i18n'
import { loadAllSessions } from '../lib/session'
import type { RoomSession } from '../lib/types'

/** 第一个画面:先选房。选完才进那个房的货品清单。 */
export function RoomPicker() {
  const [sessions, setSessions] = useState<Record<string, RoomSession>>({})
  const sync = useSyncState()
  const { lang, t } = useLang()

  useEffect(() => {
    let alive = true
    void loadAllSessions().then((all) => {
      if (!alive) return
      setSessions(Object.fromEntries(all.map((s) => [s.roomId, s])))
    })
    return () => {
      alive = false
    }
  }, [])

  const pendingByRoom = sync.pending.reduce<Record<string, number>>((acc, b) => {
    acc[b.roomId] = (acc[b.roomId] ?? 0) + b.entryCount
    return acc
  }, {})

  return (
    <div className="min-h-dvh bg-slate-100">
      <SyncBar />

      <header className="bg-slate-900 px-5 pt-5 pb-7 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* 公司标记,用原本那张厨师图,没有改过 */}
            <img
              src="icons/lichuan-logo.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-0.5"
            />
            <div className="min-w-0">
              <h1 className="text-[22px] leading-tight font-bold">{t('appTitle')}</h1>
              <p className="mt-0.5 text-[14px] text-slate-300">{t('appSubtitle')}</p>
            </div>
          </div>
          <LangToggle />
        </div>
      </header>

      <main className="-mt-3 space-y-3 rounded-t-2xl bg-slate-100 px-4 pt-5 pb-8">
        {ROOMS.map((room) => {
          const inProgress = sessions[room.id]?.entries.length ?? 0
          const pending = pendingByRoom[room.id] ?? 0
          return (
            <Link
              key={room.id}
              to={`/room/${room.id}`}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <img
                src={room.icon}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded-xl object-contain"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[19px] font-bold text-slate-900">{room.name}</span>
                </div>
                <div className="truncate text-[14px] text-slate-500">{roomLabel(room, lang)}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {inProgress > 0 ? (
                    <Badge className="bg-sky-100 text-sky-800">
                      {t('inProgressN', { n: inProgress })}
                    </Badge>
                  ) : null}
                  {pending > 0 ? (
                    <Badge className="bg-amber-100 text-amber-800">
                      {t('awaitingSyncN', { n: pending })}
                    </Badge>
                  ) : null}
                  {inProgress === 0 && pending === 0 ? (
                    <Badge className="bg-slate-100 text-slate-500">{t('roomIdle')}</Badge>
                  ) : null}
                </div>
              </div>
              <span aria-hidden className="shrink-0 text-2xl leading-none text-slate-300">
                ›
              </span>
            </Link>
          )
        })}

        <Link
          to="/sync"
          className="mt-4 block rounded-2xl border border-slate-200 bg-white p-4 text-center text-[15px] font-semibold text-slate-700 active:bg-slate-50"
        >
          {t('syncLink')}
        </Link>
      </main>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${className}`}>{children}</span>
  )
}
