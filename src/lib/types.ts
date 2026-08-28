/** 包装房的三个房。 */
export type RoomId = 'cr3' | 'cr3t' | 'cr5c'

export interface RoomConfig {
  id: RoomId
  /** 显示用短代号,也是 Google Sheet 分页名(CR5c 的 c 是小写) */
  name: string
  label: string
  labelEn: string
  sheetName: string
  listKey: string
  icon: string
}

/**
 * 包装房的产品。
 *
 * 包装房这三个房一个货品只点一个数字,
 * 没有仓库部那种「箱 + 包」两个数量。资料库里 skus 也是 null。
 * 所以这里就是单纯的一个货品一个数量,不要为了跟仓库部那支对齐而加栏位。
 */
export interface Product {
  barcode: string
  itemCode: string
  name: string
  packaging: string
  sortOrder: number
}

/** 一笔已盘点的记录,存在本机。 */
export interface CountEntry {
  id: string
  barcode: string
  itemCode: string
  name: string
  packaging: string
  qty: number
  /** ISO 字串,排序与显示用 */
  countedAt: string
}

/** 进行中的盘点。每次改动都立刻写进 IndexedDB。 */
export interface RoomSession {
  roomId: RoomId
  entries: CountEntry[]
  operator: string
  updatedAt: number
}

/**
 * 送去 Apps Script 的一列。
 *
 * ⚠️ 栏位顺序 = Google Sheet 里 CR3 / CR3T / CR5c 分页的 A 到 G 栏,不可以改、不可以加减。
 *    日期 / 时间 / 货号 / 品名 / 包装 / 数量 / 点货员
 *    这七栏是 CR3、CR3T、CR5c 三个分页共用的格式,动一个就是三个一起断。
 */
export interface SheetRow {
  sheetName: string
  date: string
  time: string
  itemCode: string
  name: string
  packaging: string
  quantity: number
  counter: string
}

export type BatchStatus = 'pending' | 'syncing' | 'failed' | 'done'

/** 出货队列里的一批。batchId 是幂等键 —— 同一个 batchId 送几次,后端只写一次。 */
export interface Batch {
  batchId: string
  roomId: RoomId
  roomName: string
  sheetName: string
  operator: string
  rows: SheetRow[]
  entryCount: number
  createdAt: number
  syncedAt?: number
  attempts: number
  nextAttemptAt: number
  lastError?: string
  status: BatchStatus
}

export interface CachedProducts {
  listKey: string
  items: Product[]
  fetchedAt: number
}

