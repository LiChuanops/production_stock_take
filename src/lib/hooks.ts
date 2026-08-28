import { useEffect, useState, useSyncExternalStore } from 'react'
import { syncEngine } from './sync'

export function useSyncState() {
  return useSyncExternalStore(syncEngine.subscribe, syncEngine.getSnapshot, syncEngine.getSnapshot)
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

/** 每 n 毫秒重新算一次「几分钟前」这种相对时间。 */
export function useNow(intervalMs = 10_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
