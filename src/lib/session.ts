import { sessionsStore } from './db'
import { formatDate, formatTime, newId } from './format'
import type { Batch, CountEntry, Product, RoomConfig, RoomId, RoomSession, SheetRow } from './types'

export function emptySession(roomId: RoomId): RoomSession {
  return { roomId, entries: [], operator: '', updatedAt: Date.now() }
}

export async function loadSession(roomId: RoomId): Promise<RoomSession> {
  return (await sessionsStore.get(roomId)) ?? emptySession(roomId)
}

export async function persistSession(session: RoomSession): Promise<void> {
  await sessionsStore.put({ ...session, updatedAt: Date.now() })
}

export async function loadAllSessions(): Promise<RoomSession[]> {
  return sessionsStore.getAll()
}

export function makeEntry(product: Product, qty: number): CountEntry {
  return {
    id: newId(),
    barcode: product.barcode,
    itemCode: product.itemCode,
    name: product.name,
    packaging: product.packaging,
    qty,
    countedAt: new Date().toISOString(),
  }
}

/**
 * 把一份盘点整理成要送出去的批次。
 * rows 的栏位顺序 = 分页的 A 到 G 栏,不可以改。
 */
export function buildBatch(room: RoomConfig, session: RoomSession): Batch {
  const rows: SheetRow[] = session.entries.map((e) => {
    const d = new Date(e.countedAt)
    return {
      sheetName: room.sheetName,
      date: formatDate(d),
      time: formatTime(d),
      itemCode: e.itemCode,
      name: e.name,
      packaging: e.packaging,
      quantity: e.qty,
      counter: session.operator,
    }
  })

  return {
    batchId: newId(),
    roomId: room.id,
    roomName: room.name,
    sheetName: room.sheetName,
    operator: session.operator,
    rows,
    entryCount: rows.length,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: 0,
    status: 'pending',
  }
}

/**
 * 把一笔已存的记录还原成 Product 的样子,给「修改数量」的弹层用。
 * 这样记录页不必再去载入整份产品清单。
 */
export function entryToProduct(e: CountEntry): Product {
  return {
    barcode: e.barcode,
    itemCode: e.itemCode,
    name: e.name,
    packaging: e.packaging,
    sortOrder: 0,
  }
}
