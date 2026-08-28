# 包装房盘点 Packing Room Stock Take

包装房三个冷房(CR3 / CR3T / CR5c)共用的一支盘点 PWA。
开进去先选冷房,选完才进那个房的货品清单。

React + TypeScript + Vite,离线优先,部署在 GitHub Pages。

跟仓库部那支(CR1 / CR2 / CR3A / B15)是**完全分开的两支 app、两个 repo**:
不同部门、不同的 Google Sheet 分页格式、不同的资料库表。不要合并,也不要互相抄设定。

| | 仓库部 | 包装房(这支) |
|---|---|---|
| 房 | CR1 / CR2 / CR3A / B15 | **CR3 / CR3T / CR5c** |
| Sheet 栏位 | A–I 九栏,箱包分开 | **A–G 七栏,一个数量** |
| 时间格式 | `15:45:30` | **`3:45 PM`** |
| 资料库 | `warehouse_stock_take` | **`packing_room_stock_take`** |
| Apps Script | `AKfycbyJckzal…` | `AKfycbxtkp0U…` |

三个房的对应关系(Apps Script 就是照 `sheetName` 去分的):

| 房 | Sheet 分页 | Supabase list_key | coldroom_location | stock_take_type |
|---|---|---|---|---|
| CR3 | `CR3` | `cr3-stock-take` (39 项) | Coldroom 3 | Fish Cake Bag |
| CR3T | `CR3T` | `cr3t-stock-take` (23 项) | Coldroom 3 Trays | Fish Cake Tray |
| CR5c | `CR5c` | `cr5c-stock-take` (31 项) | Coldroom 5c | Ngoh Hiang Bag / Tray(照货号分) |

> ⚠️ `CR5c` 的 `c` 是**小写**。Apps Script 是拿这个字串去 `switch` 的,
> 写成 `CR5C` 会掉进 `default`,资料库那边就变成 `coldroom_location='CR5C'`、
> `stock_take_type='Unknown'`。

---

## 上线前要做的三件事

照顺序做,第 1 步没做完 app 是不会动的。

### 1. 先换 Apps Script(硬性)

新 app 送出去的是 `{ batchId, sheetName, rows }`,线上那支旧脚本读的是 `payload.data`,
收到新格式会在 `data.forEach` 炸掉,回 `success:false`。资料不会丢(会一直排队重试),
但也送不出去。

1. 打开桌面上的 `APPS_SCRIPT_包装房.gs`,全选复制
2. 到现在那支 Apps Script 专案(CR3 / CR3T / CR5c 共用的那支),把 `doPost` 那个档案的内容整个换掉
3. 在编辑器里先选 `checkSheetLayout` 执行一次,看日志确认三个分页真的是七栏
4. 再选 `setup` 执行一次(会建立隐藏的 `_SyncLogPacking` 分页)
5. 「部署 > 管理部署作业 > 编辑(铅笔) > 版本选『新版本』> 部署」

> ⚠️ 第 5 步一定要用「编辑现有部署」,不要「新增部署作业」。
> 新增会给你一个不一样的 `/exec` 网址,那样就得回来改 `src/lib/config.ts`,
> 而且手机上还没换的旧 app 还指着旧网址,会变成两条线各写各的。

新脚本**同时收新旧两种格式**,所以换过去之后,员工手机上还没更新的旧 app
照样能用,行为一模一样。可以一个房一个房慢慢换,不必同一天全部换掉。

换完可以用浏览器直接开那个 `/exec` 网址确认,应该回:

```json
{"success":true,"message":"packing room stock take endpoint alive","version":"2026-08-28a …"}
```

### 2. 建 repo 并推上去

```bash
cd Desktop/packing-stocktake-pwa
git init
git add -A
git commit -m "包装房盘点 PWA 第一版"
git branch -M main
git remote add origin https://github.com/<你的帐号>/<repo 名字>.git
git push -u origin main
```

**要开一个新的 repo,不要推进仓库部那支的 repo。**

repo 叫什么名字都可以。Vite 的 `base` 是相对路径 + 用 HashRouter,
所以不管发布在哪个子路径都不用改代码。

### 3. 打开 GitHub Pages

repo 的 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
(`.github/workflows/deploy.yml` 里有 `enablement: true`,通常会自己开起来,不用手动设。)

之后每次推上 main 都会自动重新部署,第一次大概三分钟。
网址长这样:`https://<你的帐号>.github.io/<repo 名字>/`

员工手机用 Chrome 开那个网址 → 右上角三点 → 「加到主画面」。
一支就够了,三个房都在里面,不必再装三支。

旧的三支 app 建议留着跑一两个星期,确认新的没问题再叫大家删掉。
两边写进的是同一张 Google Sheet 的同一批分页,并行不会打架。

---

## 这版解决了旧 app 的什么问题

### 保存是瞎子

旧版用 `fetch(url, { mode: 'no-cors' })`。opaque 回应浏览器不给看内容也不给看状态码,
所以 `.then()` 一定会跑,一定弹「成功保存」—— 伺服器爆了、回登入页、资料一笔都没写进去,
员工看到的还是绿字成功。

现在:按下保存 → 写进 IndexedDB 的出货队列 → 立刻回「已保存」。
之后由背景引擎负责送,送不出去就排队重试(10 秒 → 30 秒 → 1 分 → 3 分 → 10 分),
而且会真的去读回应内容:不是 JSON、或 `success` 不是 true,一律当失败继续重试。
顶部那条状态列随时看得到还有几笔没送出去。

### 没有队列,断网就没了

旧版按下保存那一刻断网,资料就没了,连暂存都没有。
现在资料是先落在这台手机上,网络什么时候好什么时候送,关掉 app 也不会掉。

### 存两次

旧版没有任何锁:按钮没 disable,后端也没有 LockService 和幂等键,来两次就写两次。

现在每一批带一个 `batchId`。前端有 in-flight 锁 + 按钮 ref 锁;
后端用 LockService 上锁,写之前先查 `_SyncLogPacking` 有没有看过这个 batchId,
看过就直接回成功、什么都不写。

### 新手机装不起来

旧版的员工名单读的是 `app_staff_lists`,那张表对 anon 已经锁掉了(回 permission denied)。
而且它用 `Promise.all([货品, 员工])`,一个倒下两个一起倒 ——
现在拿一支干净的手机装旧 app,货品表和员工下拉**两个都是空的**,什么都点不了。
还能用的手机纯粹是因为 localStorage 里还留着以前的快取。

现在员工名单**写死在 `src/lib/config.ts` 的 `OPERATORS`**,根本不连网:
断网、新手机、第一次开,一定有人可以选。

名单跟旧的 CR3 / CR3T app 里那份一字不差(Tang Yee Leng、Teh Siew Hock、David、
Ma Xiao Xuan、Najib、新员工)。**不要接资料库那支 `get_stock_take_staff` RPC** ——
那支回的是仓库部的人,不是包装房的。

### 扫码游标乱跳

旧版是把游标丢给数量格,再设一个 5 秒的计时器抢回扫码框 —— 员工还在打字就被抢走。
现在没有隐藏输入框也没有计时器:打出来的东西只要**刚好等于**某个条码、
而且不是另一个更长条码的前缀,就立刻弹出数量层;填完自动回到扫码框。

### 三支 app 三个图标

以前一个房一支 app,手机上三个图标长得差不多,常常点错房。
现在一支,进去先选房。而且三个房的进行中/待同步笔数在选择页就看得到。

---

## 开发

```bash
npm install
npm run dev        # 会同时开 LAN 网址,可以直接用手机连同一个 WiFi 测
npm run build
npm run typecheck
node scripts/make-icons.mjs   # 重新产生 app 图标和三个房的小图
```

## 结构

```
src/
  lib/
    config.ts        三个房的设定、点货员工名单、Apps Script 网址、重试间隔
    types.ts         资料型别。SheetRow 的栏位顺序 = 分页的 A 到 G 栏,不可以改
    format.ts        日期时间格式 ← 时间那支不可以改成 24 小时制
    db.ts            IndexedDB(开不起来时自动退到 localStorage)
    api.ts           Supabase REST,没有用 SDK
    products.ts      产品清单:快取优先,过期才连网。每个房一份,照 listKey 分开存
    session.ts       进行中的盘点 + 组出要送的批次。每个房各一份,互不影响
    sync.ts          出货队列与同步引擎 ← 核心。三个房共用一个队列
    i18n.ts          中英文字典
  components/
    SyncBar          顶部同步状态列
    QuantitySheet    输入数量的底部弹层(只有一个数量,没有箱/包)
    OperatorPicker   盘点人员选择器
    Toast / Confirm / LangToggle
  pages/
    RoomPicker       选冷房(开进来第一页)
    CountPage        扫码盘点
    RecordsPage      记录、修改、保存
    SyncPage         同步状态、失败原因、手动重试
```

三个房的盘点是各自独立的:CR3 盘到一半切去 CR3T,回来 CR3 的数字还在。
保存也是一个房一批,不会混在一起送。

## 要注意的地方

- **`SheetRow` 的栏位顺序不能改。** 三个分页都是 A 到 G 七栏,同一个格式,
  动一个等于三个一起断。
- **`format.ts` 的 `formatTime()` 不可以改成 24 小时制。** 那个 `"3:45 PM"` 字串会原样存进
  `packing_room_stock_take.stock_time`,Apps Script 的 `getTimePeriod()` 和 `isBeforeNoon()`
  都是照这个格式解析的,换掉的话 `stock_time_period` 会变 undefined、上下午会分错。
- **`config.ts` 里 `sheetName` 的大小写不能改**,尤其 `CR5c` 那个小写 c(上面表格有说)。
- **`db.ts` 里的 `DB_NAME` 和 localStorage 字首都刻意跟仓库部那支不一样。**
  浏览器的储存是照网域分家,不是照路径 —— 两支 app 都发在 `<帐号>.github.io` 底下的话
  网域是同一个。名字取一样的话,这支 app 会去捡仓库部的出货队列,把 CR1 的资料当自己的送出去。
- **送 Apps Script 的 fetch 不要加 `Content-Type` 标头。** 加了会触发 CORS preflight(OPTIONS),
  而 Apps Script 的 `/exec` 不回应 OPTIONS,整个请求会失败。不加的话浏览器当成简单请求,直接过。
- **点货员工名单是硬代码,在 `config.ts` 的 `OPERATORS`。** 要加人改人就改那个阵列,
  push 上去等三分钟,员工手机下次开 app 自动更新。不用碰资料库,也不用改 Apps Script。
  `name` 是真正写进表格和资料库 `stock_check_by` 的字串,`label` 只是画面上显示的字。
- **`config.ts` 里的 anon key 是设计上就公开的**,权限完全由 RLS 决定,这支 app 只拿它读产品清单。
  真正不能外流的是 service_role key,那把只存在 Apps Script 里。
- **要再加一个房**:在 Supabase 的 `app_product_list_items` 建好清单,
  在 `config.ts` 的 `ROOMS` 加一列,在 `types.ts` 的 `RoomId` 加一个值,
  在 `make-icons.mjs` 的 `ROOM_TILES` 加一行再跑一次,
  最后在 `APPS_SCRIPT_包装房.gs` 的 `getColdroomLocation()` 和 `getStockTakeType()` 补上对应。

## 已知的旧行为,没有动

`isBeforeNoon()` 判断上午班的写法是 `hours < 11 || (hours === 11 && minutes <= 59)`,
所以 `12:30 AM`(半夜)会被算成下午。这是旧脚本本来就有的行为,照抄没改 ——
改了的话新旧资料的 `is_morning_stock` 会对不起来。半夜没人点货,影响不大,但知道一下。
