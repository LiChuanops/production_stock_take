import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Batch, CachedProducts, RoomSession } from './types'

/**
 * 本机储存。IndexedDB 是主力,localStorage 是后备
 * (无痕模式、旧 WebView、储存空间被封 都会让 IndexedDB 开不起来)。
 *
 * 用同一组 get/getAll/put/delete 介面包起来,上层不必管现在跑的是哪一种。
 *
 * ⚠️ DB_NAME 和 localStorage 的字首都刻意跟主 app(四个房那支)不一样。
 *    浏览器是照「网域」分家的,不是照路径 —— 两支 app 都发布在
 *    <帐号>.github.io 底下的话,网域是同一个,储存空间也是同一个。
 *    名字取一样的话,这支 app 的同步引擎会去捡主 app 的出货队列,
 *    把 CR1 的资料当成自己的送出去。名字一定要分开。
 */

interface StockTakeDB extends DBSchema {
  products: { key: string; value: CachedProducts }
  sessions: { key: string; value: RoomSession }
  outbox: { key: string; value: Batch }
}

type StoreName = 'products' | 'sessions' | 'outbox'
const KEY_PATH: Record<StoreName, string> = {
  products: 'listKey',
  sessions: 'roomId',
  outbox: 'batchId',
}

const DB_NAME = 'lichuan-stocktake-packing'
const DB_VERSION = 1

export interface Store<T> {
  get(key: string): Promise<T | undefined>
  getAll(): Promise<T[]>
  put(value: T): Promise<void>
  delete(key: string): Promise<void>
}

/** 目前是不是退到了 localStorage 后备模式。UI 会据此提醒使用者。 */
export let usingFallback = false

let dbPromise: Promise<IDBPDatabase<StockTakeDB> | null> | null = null

function openIdb(): Promise<IDBPDatabase<StockTakeDB> | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return openDB<StockTakeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const name of Object.keys(KEY_PATH) as StoreName[]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: KEY_PATH[name] })
        }
      }
    },
  }).catch((err) => {
    console.error('[db] IndexedDB 开不起来,改用 localStorage:', err)
    return null
  })
}

function getDB() {
  if (!dbPromise) dbPromise = openIdb()
  return dbPromise
}

/* ---------------- localStorage 后备实作 ---------------- */

function lsKey(store: StoreName) {
  return `stocktake-packing:${store}`
}

function lsRead<T>(store: StoreName): Record<string, T> {
  try {
    const raw = localStorage.getItem(lsKey(store))
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

function lsWrite<T>(store: StoreName, data: Record<string, T>) {
  localStorage.setItem(lsKey(store), JSON.stringify(data))
}

function fallbackStore<T>(store: StoreName): Store<T> {
  const kp = KEY_PATH[store]
  return {
    async get(key) {
      return lsRead<T>(store)[key]
    },
    async getAll() {
      return Object.values(lsRead<T>(store))
    },
    async put(value) {
      const all = lsRead<T>(store)
      all[String((value as Record<string, unknown>)[kp])] = value
      lsWrite(store, all)
    },
    async delete(key) {
      const all = lsRead<T>(store)
      delete all[key]
      lsWrite(store, all)
    },
  }
}

/* ---------------- 对外介面 ---------------- */

function makeStore<T>(name: StoreName): Store<T> {
  const fb = fallbackStore<T>(name)
  const withDb = async <R,>(fn: (db: IDBPDatabase<StockTakeDB>) => Promise<R>, viaFallback: () => Promise<R>): Promise<R> => {
    const db = await getDB()
    if (!db) {
      usingFallback = true
      return viaFallback()
    }
    try {
      return await fn(db)
    } catch (err) {
      console.error(`[db] ${name} 操作失败,改用 localStorage:`, err)
      usingFallback = true
      return viaFallback()
    }
  }
  return {
    get: (key) => withDb((db) => db.get(name, key) as Promise<T | undefined>, () => fb.get(key)),
    getAll: () => withDb((db) => db.getAll(name) as Promise<T[]>, () => fb.getAll()),
    put: (value) => withDb(async (db) => { await db.put(name, value as never) }, () => fb.put(value)),
    delete: (key) => withDb(async (db) => { await db.delete(name, key) }, () => fb.delete(key)),
  }
}

export const productsStore = makeStore<CachedProducts>('products')
export const sessionsStore = makeStore<RoomSession>('sessions')
export const outboxStore = makeStore<Batch>('outbox')
