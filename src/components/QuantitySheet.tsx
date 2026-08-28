import { useEffect, useRef, useState } from 'react'
import type { CountEntry, Product } from '../lib/types'
import { useLang } from '../lib/i18n'

interface Props {
  product: Product
  /** 有值代表是在改一笔已经盘过的记录 */
  existing?: CountEntry
  onConfirm: (qty: number) => void
  onDelete?: () => void
  onClose: () => void
}

/**
 * 输入数量的底部弹层。
 * 冷房里戴手套操作,所以:按键都 >= 56px、有加减钮、键盘直接跳数字。
 */
export function QuantitySheet({ product, existing, onConfirm, onDelete, onClose }: Props) {
  const { t } = useLang()
  const [qty, setQty] = useState(() => (existing ? String(existing.qty || '') : ''))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 60)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const value = toQty(qty)
  const valid = value > 0

  const submit = () => {
    if (!valid) return
    onConfirm(value)
  }

  const bump = (delta: number) => {
    const next = Math.max(0, (Number.parseInt(qty, 10) || 0) + delta)
    setQty(next === 0 ? '' : String(next))
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-slate-900/50" onClick={onClose}>
      <div
        className="animate-sheet-up max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 border-b border-slate-100 bg-white px-4 pt-3 pb-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
          <h2 className="text-[17px] leading-snug font-semibold text-slate-900">{product.name}</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {product.packaging}
            {product.barcode ? <span className="ml-2 font-mono">#{product.barcode}</span> : null}
          </p>
          {existing ? (
            <p className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-1 text-[12px] font-medium text-amber-800">
              {t('editingExisting')}
            </p>
          ) : null}
        </div>

        <div className="px-4 py-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[15px] font-semibold text-slate-800">{t('qtyField')}</span>
            {product.itemCode ? (
              <span className="font-mono text-[12px] text-slate-400">{product.itemCode}</span>
            ) : null}
          </div>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => bump(-1)}
              aria-label={t('minusOne')}
              className="w-14 shrink-0 rounded-xl bg-slate-100 text-2xl font-semibold text-slate-700 active:bg-slate-200"
            >
              -
            </button>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              value={qty}
              placeholder="0"
              onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
              className="min-h-[60px] w-full rounded-xl border-2 border-slate-200 text-center text-[26px] font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => bump(1)}
              aria-label={t('plusOne')}
              className="w-14 shrink-0 rounded-xl bg-slate-100 text-2xl font-semibold text-slate-700 active:bg-slate-200"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="min-h-[56px] rounded-xl bg-slate-100 text-[16px] font-semibold text-slate-700 active:bg-slate-200"
            >
              {t('cancel')}
            </button>
            <button
              onClick={submit}
              disabled={!valid}
              className="min-h-[56px] rounded-xl bg-slate-900 text-[16px] font-semibold text-white active:bg-slate-800 disabled:bg-slate-300"
            >
              {t('confirm')}
            </button>
          </div>
          {!valid ? (
            <p className="text-center text-[13px] text-slate-500">{t('needOneQty')}</p>
          ) : null}
          {onDelete ? (
            <button
              onClick={onDelete}
              className="min-h-[48px] w-full rounded-xl border border-rose-200 text-[15px] font-semibold text-rose-600 active:bg-rose-50"
            >
              {t('deleteThisEntry')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function toQty(v: string): number {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}
