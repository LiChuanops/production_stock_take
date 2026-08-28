import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Confirm } from '../components/Confirm'
import { LangToggle } from '../components/LangToggle'
import { QuantitySheet } from '../components/QuantitySheet'
import { SyncBar } from '../components/SyncBar'
import { useToast } from '../components/Toast'
import { getRoom, roomLabel } from '../lib/config'
import { relativeTime } from '../lib/format'
import { useLang } from '../lib/i18n'
import { getCachedProducts, isStale, refreshProducts } from '../lib/products'
import { makeEntry } from '../lib/session'
import { useRoomSession } from '../lib/useRoomSession'
import type { CountEntry, Product } from '../lib/types'

type Filter = 'todo' | 'done'

export function CountPage() {
  const { roomId } = useParams()
  const room = getRoom(roomId)
  const navigate = useNavigate()
  const toast = useToast()
  const { lang, t } = useLang()

  const { session, update } = useRoomSession(room?.id)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todo')
  const [open, setOpen] = useState<{ product: Product; existing?: CountEntry } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const scanRef = useRef<HTMLInputElement>(null)

  const listKey = room?.listKey

  /* ---- 载入产品清单:先给快取(瞬间显示),需要时才连网 ---- */
  useEffect(() => {
    if (!listKey) return
    let alive = true
    void (async () => {
      const cached = await getCachedProducts(listKey)
      if (!alive) return
      if (cached) {
        setProducts(cached.items)
        setFetchedAt(cached.fetchedAt)
        return
      }
      if (!navigator.onLine) {
        setLoadError('OFFLINE_FIRST_RUN')
        return
      }
      try {
        const fresh = await refreshProducts(listKey)
        if (!alive) return
        setProducts(fresh.items)
        setFetchedAt(fresh.fetchedAt)
      } catch (err) {
        if (alive) setLoadError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      alive = false
    }
  }, [listKey])

  /* ---- 清单太旧就在背景默默更新,但只在还没开始盘的时候做 ---- */
  useEffect(() => {
    if (!listKey || !products || !session) return
    if (session.entries.length > 0) return
    if (!navigator.onLine) return
    if (!isStale(fetchedAt ? { listKey, items: products, fetchedAt } : undefined)) return
    let alive = true
    void refreshProducts(listKey)
      .then((fresh) => {
        if (!alive) return
        setProducts(fresh.items)
        setFetchedAt(fresh.fetchedAt)
      })
      .catch(() => {
        /* 背景更新失败不吵使用者,快取还能用 */
      })
    return () => {
      alive = false
    }
    // 只在清单刚载入好、且还没开始盘的时候跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, products === null, session?.entries.length === 0])

  const entriesByBarcode = useMemo(() => {
    const map = new Map<string, CountEntry>()
    for (const e of session?.entries ?? []) map.set(e.barcode, e)
    return map
  }, [session?.entries])

  const filtered = useMemo(() => {
    if (!products) return []
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const counted = entriesByBarcode.has(p.barcode)
      if (filter === 'todo' && counted) return false
      if (filter === 'done' && !counted) return false
      if (!q) return true
      return (
        p.barcode.toLowerCase().startsWith(q) ||
        p.itemCode.toLowerCase().startsWith(q) ||
        p.name.toLowerCase().includes(q)
      )
    })
  }, [products, query, filter, entriesByBarcode])

  if (!room) return <Navigate to="/" replace />

  const total = products?.length ?? 0
  const counted = entriesByBarcode.size
  const percent = total ? Math.round((counted / total) * 100) : 0

  const openProduct = (p: Product) => {
    setOpen({ product: p, existing: entriesByBarcode.get(p.barcode) })
    setQuery('')
  }

  /**
   * 扫码枪打字很快,通常最后再送一个 Enter。
   * 只要打出来的东西「刚好等于某个条码」而且不是另一个更长条码的前缀,就直接开。
   * 旧版是让隐藏输入框抢游标、五秒后再抢回去,那正是游标乱跳的元凶。
   */
  const onQueryChange = (raw: string) => {
    const value = raw.trim()
    setQuery(raw)
    if (!products || !value) return
    const exact = products.find((p) => p.barcode === value)
    if (!exact) return
    const ambiguous = products.some((p) => p.barcode !== value && p.barcode.startsWith(value))
    if (!ambiguous) openProduct(exact)
  }

  const onScanEnter = () => {
    const value = query.trim()
    if (!value || !products) return
    const exact = products.find((p) => p.barcode === value || p.itemCode === value)
    if (exact) {
      openProduct(exact)
      return
    }
    if (filtered.length === 1) {
      openProduct(filtered[0])
      return
    }
    toast.error(t('barcodeNotFound', { code: value }))
    setQuery('')
  }

  const confirmQty = (qty: number) => {
    if (!open) return
    const product = open.product
    update((s) => ({
      ...s,
      entries: [makeEntry(product, qty), ...s.entries.filter((e) => e.barcode !== product.barcode)],
    }))
    toast.success(t('recorded', { name: product.name }))
    setOpen(null)
    setTimeout(() => scanRef.current?.focus(), 50)
  }

  const removeEntry = () => {
    if (!open) return
    const barcode = open.product.barcode
    update((s) => ({ ...s, entries: s.entries.filter((e) => e.barcode !== barcode) }))
    toast.info(t('entryDeleted'))
    setOpen(null)
  }

  const doRefreshProducts = async () => {
    if (!listKey) return
    if (!navigator.onLine) return toast.error(t('offlineNoProductRefresh'))
    if ((session?.entries.length ?? 0) > 0) {
      return toast.error(t('saveBeforeRefresh'))
    }
    setBusy('products')
    try {
      const fresh = await refreshProducts(listKey)
      setProducts(fresh.items)
      setFetchedAt(fresh.fetchedAt)
      toast.success(t('productsUpdated', { n: fresh.items.length }))
      setMenuOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <SyncBar />

      <header className="bg-slate-900 px-3 pt-3 pb-4 text-white">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label={t('back')}
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl leading-none active:bg-white/10"
          >
            ‹
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[18px] leading-tight font-bold">{room.name}</div>
            <div className="truncate text-[13px] text-slate-300">{roomLabel(room, lang)}</div>
          </div>
          <LangToggle />
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t('menu')}
            className="-mr-1 flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl active:bg-white/10"
          >
            <span className="block h-0.5 w-5 bg-white" />
            <span className="block h-0.5 w-5 bg-white" />
            <span className="block h-0.5 w-5 bg-white" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums">
            {counted}/{total}
          </span>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-2.5">
        <input
          ref={scanRef}
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onScanEnter()
            }
          }}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t('scanPlaceholder')}
          className="min-h-[52px] w-full rounded-xl border-2 border-slate-200 px-4 text-[17px] text-slate-900 focus:border-slate-900 focus:outline-none"
        />
        <div className="mt-2 flex gap-2">
          <Chip active={filter === 'todo'} onClick={() => setFilter('todo')}>
            {t('filterTodo', { n: total - counted })}
          </Chip>
          <Chip active={filter === 'done'} onClick={() => setFilter('done')}>
            {t('filterDone', { n: counted })}
          </Chip>
        </div>
      </div>

      <main className="flex-1 px-3 py-3 pb-28">
        {loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[15px] leading-relaxed text-rose-800">
            {loadError === 'OFFLINE_FIRST_RUN' ? t('needNetworkFirstTime') : loadError}
          </div>
        ) : !products ? (
          <p className="py-10 text-center text-[15px] text-slate-500">{t('loadingProducts')}</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-slate-500">
            {query ? t('noMatch', { q: query }) : filter === 'todo' ? t('allCounted') : t('noData')}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => {
              const entry = entriesByBarcode.get(p.barcode)
              return (
                <li key={p.barcode}>
                  <button
                    onClick={() => openProduct(p)}
                    className={`list-item flex w-full items-center gap-3 rounded-xl border p-3 text-left active:bg-slate-50 ${
                      entry ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] leading-snug font-semibold text-slate-900">
                        {p.name}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-slate-500">
                        <span>{p.packaging}</span>
                        {p.barcode ? (
                          <span className="font-mono text-slate-400">#{p.barcode}</span>
                        ) : null}
                      </div>
                    </div>
                    {entry ? (
                      <div className="shrink-0 text-right">
                        <div className="text-[17px] font-bold text-emerald-700 tabular-nums">
                          {t('qtyUnit', { n: entry.qty })}
                        </div>
                        <div className="text-[12px] text-emerald-600">{t('tapToEdit')}</div>
                      </div>
                    ) : (
                      <span aria-hidden className="shrink-0 text-xl text-slate-300">
                        ›
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-3 py-3 pb-safe">
        <button
          onClick={() => navigate(`/room/${room.id}/records`)}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[17px] font-semibold text-white active:bg-slate-800"
        >
          {t('viewRecords')}
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[14px] tabular-nums">
            {counted}
          </span>
        </button>
      </div>

      {open ? (
        <QuantitySheet
          product={open.product}
          existing={open.existing}
          onConfirm={confirmQty}
          onDelete={open.existing ? removeEntry : undefined}
          onClose={() => {
            setOpen(null)
            setTimeout(() => scanRef.current?.focus(), 50)
          }}
        />
      ) : null}

      {menuOpen ? (
        <div
          className="fixed inset-0 z-[85] flex items-end bg-slate-900/50"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="animate-sheet-up w-full rounded-t-2xl bg-white p-4 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />

            <MenuItem onClick={doRefreshProducts} disabled={busy !== null}>
              {busy === 'products' ? t('menuUpdating') : t('menuRefreshProducts')}
              <span className="block text-[13px] font-normal text-slate-500">
                {t('menuProductsMeta', { n: total })}
                {fetchedAt ? t('menuLastUpdated', { t: relativeTime(fetchedAt, lang) }) : ''}
              </span>
            </MenuItem>
            <MenuItem onClick={() => navigate('/sync')}>{t('syncLink')}</MenuItem>
            <MenuItem
              danger
              disabled={counted === 0}
              onClick={() => {
                setMenuOpen(false)
                setConfirmClear(true)
              }}
            >
              {t('menuClear')}
              <span className="block text-[13px] font-normal text-slate-500">
                {t('menuClearMeta', { n: counted })}
              </span>
            </MenuItem>
            <button
              onClick={() => setMenuOpen(false)}
              className="mt-2 min-h-[52px] w-full rounded-xl bg-slate-100 text-[16px] font-semibold text-slate-700 active:bg-slate-200"
            >
              {t('close')}
            </button>
          </div>
        </div>
      ) : null}

      <Confirm
        open={confirmClear}
        danger
        title={t('confirmClearTitle')}
        body={t('confirmClearBody', { n: counted })}
        confirmLabel={t('confirmClearOk')}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          update((s) => ({ ...s, entries: [] }))
          setConfirmClear(false)
          toast.info(t('cleared'))
        }}
      />
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[38px] flex-1 rounded-lg px-2 text-[14px] font-medium tabular-nums ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 active:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mb-2 min-h-[56px] w-full rounded-xl px-4 py-3 text-left text-[16px] font-semibold active:bg-slate-100 disabled:opacity-40 ${
        danger ? 'text-rose-600' : 'text-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
