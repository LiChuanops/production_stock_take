import { useCallback, useEffect, useState } from 'react'
import { loadSession, persistSession } from './session'
import type { RoomId, RoomSession } from './types'

/**
 * 某个房「进行中」的盘点。
 * 每一次改动都会立刻写进本机储存 —— 这就是「存进本机就算成功」的那个「存」。
 *
 * 三个房各自一份,互不影响:CR3 盘到一半切去 CR3T,回来时 CR3 的数字还在。
 */
export function useRoomSession(roomId: RoomId | undefined) {
  const [session, setSession] = useState<RoomSession | null>(null)

  useEffect(() => {
    if (!roomId) return
    let alive = true
    void loadSession(roomId).then((s) => {
      if (alive) setSession(s)
    })
    return () => {
      alive = false
    }
  }, [roomId])

  // session 一变就落盘。放在 effect 里而不是在 setState 里做,
  // 这样 StrictMode 重复执行也不会有副作用问题。
  useEffect(() => {
    if (session) void persistSession(session)
  }, [session])

  const update = useCallback((fn: (s: RoomSession) => RoomSession) => {
    setSession((prev) => (prev ? fn(prev) : prev))
  }, [])

  return { session, update, setSession }
}
