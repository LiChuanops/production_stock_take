import { useCallback, useSyncExternalStore } from 'react'
import { createEmitter } from './emitter'

export type Lang = 'zh' | 'en'

const STORAGE_KEY = 'stocktake-packing:lang'
const emitter = createEmitter()

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* 无痕模式读不到就用预设 */
  }
  return 'zh'
}

let current: Lang = readLang()

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang) {
  current = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* 存不进去也无所谓,这次开启还是会生效 */
  }
  document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en'
  emitter.emit()
}

/* ================================================================== */
/* 字典                                                                */
/* ================================================================== */

const zh = {
  /* 通用 */
  back: '返回',
  cancel: '取消',
  confirm: '确认',
  close: '关闭',
  details: '详情',
  retryNow: '立即重试',
  langLabel: '语言 Language',

  /* 时间 */
  justNow: '刚刚',
  secAgo: '{n} 秒前',
  minAgo: '{n} 分钟前',
  hourAgo: '{n} 小时前',
  dayAgo: '{n} 天前',
  retrySoon: '即将重试',
  retryInSec: '{n} 秒后重试',
  retryInMin: '{n} 分钟后重试',

  /* 选择地点 */
  appTitle: '包装房盘点',
  appSubtitle: 'Packing Room · 选择要盘点的冷房',
  inProgressN: '进行中 {n} 笔',
  awaitingSyncN: '待同步 {n} 笔',
  roomIdle: '没有进行中的盘点',
  syncLink: '同步状态与记录',

  /* 同步状态条 */
  barAllSynced: '已连线 · 全部已同步',
  barOfflineIdle: '离线中 · 没有待同步的资料',
  barLastSync: '· 最后同步 {t}',
  barSyncing: '正在同步 {b} 批 ({e} 笔)',
  barOfflinePending: '离线 · {b} 批待同步 ({e} 笔)',
  barPending: '{b} 批待同步 ({e} 笔) · {c}',

  /* 盘点页 */
  scanPlaceholder: '扫描条码,或输入名称搜寻',
  filterTodo: '未盘点 {n}',
  filterDone: '已盘点 {n}',
  filterAll: '全部 {n}',
  loadingProducts: '载入产品清单…',
  noMatch: '没有符合「{q}」的产品',
  allCounted: '这个房全部盘完了',
  noData: '没有资料',
  tapToEdit: '点一下可改',
  qtyUnit: '{n}',
  viewRecords: '查看记录并保存',
  needNetworkFirstTime: '这个房还没下载过产品清单,第一次使用要先连上网络。',
  barcodeNotFound: '找不到条码 {code}',
  recorded: '{name} 已记录',
  entryDeleted: '已删除这笔记录',
  menu: '选单',
  menuRefreshProducts: '更新产品清单',
  menuProductsMeta: '目前 {n} 项',
  menuLastUpdated: ' · 上次更新 {t}',
  menuUpdating: '更新中…',
  menuClear: '清空这次盘点',
  menuClearMeta: '{n} 笔还没保存的记录会被删掉',
  offlineNoProductRefresh: '现在离线,无法更新清单',
  saveBeforeRefresh: '这次盘点还没保存,先保存再更新清单',
  productsUpdated: '产品清单已更新,共 {n} 项',
  confirmClearTitle: '清空这次盘点?',
  confirmClearBody: '{n} 笔还没保存的记录会被删掉,而且救不回来。',
  confirmClearOk: '确定清空',
  cleared: '已清空',

  /* 数量弹层 */
  qtyField: '数量 Qty',
  editingExisting: '正在修改已盘点的记录',
  needOneQty: '请先输入数量',
  deleteThisEntry: '删除这笔记录',
  minusOne: '数量减一',
  plusOne: '数量加一',

  /* 记录页 */
  recordsTitle: '盘点记录',
  recordsMeta: '{room} · {n} 笔 · 合计 {c}',
  recordsEmpty: '还没有盘点记录',
  goCount: '回去开始盘点',
  editShort: '改',
  deleteShort: '删',
  chooseOperator: '请选择盘点人员',
  saveN: '保存 {n} 笔记录',
  saving: '保存中…',
  saveHint: '保存后资料先存在这台手机,再由背景自动送去 Google 表格和资料库',
  needOperator: '请先选择盘点人员',
  nothingToSave: '没有可保存的记录',
  savedN: '已保存 {n} 笔,正在背景同步',
  saveFailed: '保存失败:{msg}',
  updated: '已更新',
  deleted: '已删除',
  confirmDeleteEntryTitle: '删除这笔记录?',
  searchName: '搜寻名字',
  noStaffYet: '还没有人员名单',
  operatorChosen: '盘点人员',

  /* 同步页 */
  syncTitle: '同步状态',
  network: '网络',
  online: '已连线',
  offline: '离线',
  pendingLabel: '待同步',
  none: '没有',
  nBatches: '{n} 批',
  lastSuccess: '最后成功',
  never: '还没有过',
  storage: '本机储存',
  buildLabel: '版本',
  storageFallback: 'localStorage(后备)',
  fallbackWarning:
    '这台手机的 IndexedDB 用不了(可能是无痕模式或浏览器设定),已经退到 localStorage。资料还是存得住,但容量小很多,请尽快保存并同步。',
  pendingHeading: '待同步 ({n})',
  retryAll: '全部立即重试',
  allSent: '全部资料都送出去了',
  batchLine: '{room} · {n} 笔',
  savedAt: '保存于 {t}',
  attemptsN: ' · 已试 {n} 次',
  discardBatch: '放弃这批',
  statusSending: '送出中',
  statusQueued: '排队中',
  doneHeading: '最近同步成功 ({n})',
  doneEmpty: '这台手机最近三天还没有成功同步的记录',
  sentAt: '{t} 送出',
  doneNote: '成功记录只保留三天,给现场核对用。正式资料以 Google 表格和资料库为准。',
  confirmDiscardTitle: '放弃这批资料?',
  confirmDiscardBody:
    '{room} 的 {n} 笔记录会从这台手机删掉,而且不会再送出去。只有在你已经手动补进表格的情况下才这样做。',
  confirmDiscardOk: '确定放弃',
  discarded: '已放弃这批资料',
  retrying: '正在重试',
  requeued: '已重新排队,正在尝试送出',
} as const

type Dict = Record<keyof typeof zh, string>

const en: Dict = {
  back: 'Back',
  cancel: 'Cancel',
  confirm: 'Confirm',
  close: 'Close',
  details: 'Details',
  retryNow: 'Retry now',
  langLabel: '语言 Language',

  justNow: 'just now',
  secAgo: '{n}s ago',
  minAgo: '{n} min ago',
  hourAgo: '{n} h ago',
  dayAgo: '{n} d ago',
  retrySoon: 'retrying soon',
  retryInSec: 'retry in {n}s',
  retryInMin: 'retry in {n} min',

  appTitle: 'Packing Room',
  appSubtitle: 'Packing Room · choose a coldroom',
  inProgressN: '{n} in progress',
  awaitingSyncN: '{n} awaiting sync',
  roomIdle: 'No count in progress',
  syncLink: 'Sync status & history',

  barAllSynced: 'Online · everything synced',
  barOfflineIdle: 'Offline · nothing pending',
  barLastSync: '· last sync {t}',
  barSyncing: 'Syncing {b} batch(es), {e} records',
  barOfflinePending: 'Offline · {b} batch(es), {e} records pending',
  barPending: '{b} batch(es), {e} records pending · {c}',

  scanPlaceholder: 'Scan barcode, or search by name',
  filterTodo: 'To count {n}',
  filterDone: 'Counted {n}',
  filterAll: 'All {n}',
  loadingProducts: 'Loading product list…',
  noMatch: 'No product matches "{q}"',
  allCounted: 'Everything in this room is counted',
  noData: 'No data',
  tapToEdit: 'Tap to edit',
  qtyUnit: '{n}',
  viewRecords: 'Review & save',
  needNetworkFirstTime:
    "This room's product list has never been downloaded. Connect to the internet once to get it.",
  barcodeNotFound: 'Barcode {code} not found',
  recorded: '{name} recorded',
  entryDeleted: 'Record deleted',
  menu: 'Menu',
  menuRefreshProducts: 'Update product list',
  menuProductsMeta: '{n} items',
  menuLastUpdated: ' · updated {t}',
  menuUpdating: 'Updating…',
  menuClear: 'Clear this count',
  menuClearMeta: '{n} unsaved records will be deleted',
  offlineNoProductRefresh: "Offline — can't update the product list",
  saveBeforeRefresh: 'Save this count before updating the product list',
  productsUpdated: 'Product list updated — {n} items',
  confirmClearTitle: 'Clear this count?',
  confirmClearBody: '{n} unsaved records will be deleted for good.',
  confirmClearOk: 'Clear it',
  cleared: 'Cleared',

  qtyField: '数量 Qty',
  editingExisting: 'Editing a record you already counted',
  needOneQty: 'Enter a quantity first',
  deleteThisEntry: 'Delete this record',
  minusOne: 'Quantity minus one',
  plusOne: 'Quantity plus one',

  recordsTitle: 'Count records',
  recordsMeta: '{room} · {n} records · {c} total',
  recordsEmpty: 'No records yet',
  goCount: 'Go back and start counting',
  editShort: 'Edit',
  deleteShort: 'Del',
  chooseOperator: 'Choose operator',
  saveN: 'Save {n} records',
  saving: 'Saving…',
  saveHint:
    'Saved on this phone first, then sent to Google Sheets and the database automatically in the background',
  needOperator: 'Choose an operator first',
  nothingToSave: 'Nothing to save',
  savedN: 'Saved {n} records — syncing in the background',
  saveFailed: 'Save failed: {msg}',
  updated: 'Updated',
  deleted: 'Deleted',
  confirmDeleteEntryTitle: 'Delete this record?',
  searchName: 'Search name',
  noStaffYet: 'No operator list yet',
  operatorChosen: 'Operator',

  syncTitle: 'Sync status',
  network: 'Network',
  online: 'Online',
  offline: 'Offline',
  pendingLabel: 'Pending',
  none: 'None',
  nBatches: '{n} batch(es)',
  lastSuccess: 'Last success',
  never: 'Never',
  storage: 'Local storage',
  buildLabel: 'Build',
  storageFallback: 'localStorage (fallback)',
  fallbackWarning:
    'IndexedDB is unavailable on this phone (private mode or a browser setting), so we fell back to localStorage. Data is still stored, but capacity is much smaller — save and sync soon.',
  pendingHeading: 'Pending ({n})',
  retryAll: 'Retry all now',
  allSent: 'Everything has been sent',
  batchLine: '{room} · {n} records',
  savedAt: 'saved {t}',
  attemptsN: ' · {n} attempts',
  discardBatch: 'Discard',
  statusSending: 'Sending',
  statusQueued: 'Queued',
  doneHeading: 'Recently synced ({n})',
  doneEmpty: 'No successful syncs on this phone in the last 3 days',
  sentAt: 'sent {t}',
  doneNote:
    'Kept for three days so you can check on site. Google Sheets and the database are the system of record.',
  confirmDiscardTitle: 'Discard this batch?',
  confirmDiscardBody:
    '{n} records from {room} will be deleted from this phone and never sent. Only do this if you have already entered them into the sheet by hand.',
  confirmDiscardOk: 'Discard it',
  discarded: 'Batch discarded',
  retrying: 'Retrying',
  requeued: 'Re-queued — trying to send now',
}

const DICTS: Record<Lang, Dict> = { zh, en }

export type MsgKey = keyof typeof zh

export function translate(lang: Lang, key: MsgKey, vars?: Record<string, string | number>): string {
  const raw = DICTS[lang][key]
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/* ================================================================== */
/* React 介面                                                          */
/* ================================================================== */

export function useLang() {
  const lang = useSyncExternalStore(emitter.subscribe, getLang, getLang)
  const t = useCallback(
    (key: MsgKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  )
  return { lang, setLang, t }
}

export type T = ReturnType<typeof useLang>['t']
