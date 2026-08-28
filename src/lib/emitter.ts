type Listener = () => void

/** 最小的发布订阅,给 useSyncExternalStore 用。 */
export function createEmitter() {
  const listeners = new Set<Listener>()
  return {
    subscribe(fn: Listener) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    emit() {
      for (const fn of [...listeners]) fn()
    },
  }
}
