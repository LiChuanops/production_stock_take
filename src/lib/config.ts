import type { RoomConfig } from './types'

/**
 * Supabase anon key —— 这把钥匙是「设计上就公开」的,前端一定看得到。
 * 它的权限完全由资料库的 RLS 决定,这支 app 只拿它读 app_product_list_items。
 *
 * ⚠️ 绝对不要把 service_role key 放进这个 repo。那把钥匙无视 RLS,
 *    等于整个资料库的万能钥匙,只能待在 Apps Script 服务端。
 */
export const SUPABASE_URL = 'https://jbpvqlvlokvqpkulisxi.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicHZxbHZsb2t2cXBrdWxpc3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTE3NzYsImV4cCI6MjA3NTYyNzc3Nn0.cwCoHFCy3K_HdTIIk_jJUCgMXIdub2HbnxqTETBKans'

/**
 * 包装房那支 Apps Script 的 /exec 网址 —— CR3 / CR3T / CR5c 三个分页共用同一支。
 * 这就是三个房现在正在用的那个网址,没有换。
 *
 * 做法是把那支脚本的「代码」换成 APPS_SCRIPT_包装房.gs(加了 batchId 去重和上锁),
 * 部署的时候选「编辑现有部署 > 版本改新版本」,网址不变。
 * 这样手机上还没更新的旧 app 也照样能用。
 *
 * ⚠️ 这里「不可以」填仓库部(CR1/CR2/CR3A/B15)那支的网址。
 *    那支写的是 9 栏、进的是 warehouse_stock_take,是另一个部门的另一套东西。
 */
export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxtkp0U6W1YL9ixCfFERGAkgVNnhatwhGoBkLSWBfg0BhtvFlru6tz2Lc8IpZTIQHLPzA/exec'

/**
 * 包装房的三个房。
 *
 * ⚠️ sheetName 必须跟 Google Sheet 的分页名称一字不差,大小写也算 ——
 *    CR5c 那个 c 是小写。Apps Script 的 getColdroomLocation() 和
 *    getStockTakeType() 是拿这个字串去 switch 的,写成 'CR5C' 会掉进 default,
 *    资料库那边就变成 coldroom_location='CR5C'、stock_take_type='Unknown'。
 *
 * listKey 对应 Supabase 的 app_product_list_items.list_key。
 */
export const ROOMS: RoomConfig[] = [
  {
    id: 'cr3',
    name: 'CR3',
    label: '三号冷房 · 鱼饼袋装',
    labelEn: 'Coldroom 3 · Fish Cake Bag',
    sheetName: 'CR3',
    listKey: 'cr3-stock-take',
    icon: 'icons/cr3.png',
  },
  {
    id: 'cr3t',
    name: 'CR3T',
    label: '三号冷房 · 鱼饼盘装',
    labelEn: 'Coldroom 3 Trays · Fish Cake Tray',
    sheetName: 'CR3T',
    listKey: 'cr3t-stock-take',
    icon: 'icons/cr3t.png',
  },
  {
    id: 'cr5c',
    name: 'CR5c',
    label: '五号冷房 C · 五香',
    labelEn: 'Coldroom 5c · Ngoh Hiang',
    sheetName: 'CR5c',
    listKey: 'cr5c-stock-take',
    icon: 'icons/cr5c.png',
  },
]

export function getRoom(id: string | undefined): RoomConfig | undefined {
  return ROOMS.find((r) => r.id === id)
}

export interface Operator {
  /** 真正写进 Google Sheet 和资料库 stock_check_by 的字串,不要乱改 */
  name: string
  /** 画面上显示的字 */
  label: string
}

/**
 * 包装房的点货员工,写死在这里。
 *
 * 为什么不从资料库抓:
 *   - 包装房跟仓库部不是同一批人。资料库那支 get_stock_take_staff RPC 回的是
 *     仓库部的人(Chen Long Zhi、Su Dong 那几个),接过来是错的。
 *   - 旧的 app_staff_lists 是照 list_key 分包装房名单的,但那张表对 anon 已经锁掉了
 *     (permission denied)。旧 app 现在拿干净手机装上去,员工下拉是空的,就是因为这个。
 *   - 名单一年动不了几次,为它多一次网络请求、多一个会失败的地方不划算。
 *     写死在这里 = 断网、新手机、第一次开都一定有人可以选。
 *
 * 名单跟旧的 CR3 / CR3T app 里那份一字不差。
 *
 * 要加人或改人:改这个阵列 → git push → 等 GitHub Actions 跑完(约三分钟)→
 * 员工手机下次开 app 会自动更新。不用碰资料库,也不用改 Apps Script。
 */
export const OPERATORS: Operator[] = [
  { name: 'Tang Yee Leng', label: 'Tang Yee Leng' },
  { name: 'Teh Siew Hock', label: 'Teh Siew Hock' },
  { name: 'David', label: 'David' },
  { name: 'Ma Xiao Xuan', label: 'Ma Xiao Xuan' },
  { name: 'Najib', label: 'Najib' },
  { name: 'New Worker', label: '*新员工 New Worker' },
]

/**
 * 送不出去时的重试间隔(毫秒)。最后一档会一直沿用。
 *
 * 第一步不能太短:客户端放弃之后,Apps Script 那边其实还在跑、还握着锁。
 * 马上重试只会卡在锁上,等于自己堵自己。
 */
export const RETRY_BACKOFF_MS = [10_000, 30_000, 60_000, 180_000, 600_000]

/**
 * 单次提交的逾时。
 *
 * Apps Script 冷启动实测要 12 秒(而且那还只是一支什么都不做的 doGet),
 * 热了之后大约 1.5 秒。加上开试算表、写入,冷的时候超过 30 秒很正常 ——
 * 所以给到 90 秒。
 *
 * 等久一点不影响使用者:保存是本机操作,早就回「已保存」了,
 * 这个逾时只关系到背景同步。
 */
export const REQUEST_TIMEOUT_MS = 90_000

/** 背景同步的巡逻间隔。 */
export const SYNC_POLL_MS = 20_000

/** 产品清单快取多久之后视为「旧」(仍可用,只是会在背景更新)。 */
export const PRODUCTS_STALE_MS = 24 * 60 * 60 * 1000

/** 依语言取地点的说明文字。 */
export function roomLabel(room: RoomConfig, lang: 'zh' | 'en'): string {
  return lang === 'en' ? room.labelEn : room.label
}
