import { useEffect, useMemo, useRef, useState } from 'react'
import type { Operator } from '../lib/config'
import { useLang } from '../lib/i18n'

interface Props {
  value: string
  options: Operator[]
  onChange: (name: string) => void
}

/**
 * 盘点人员选择器。
 *
 * 没有用原生 <select>:安卓上它会跳出系统的清单对话框,长得跟 app 完全两回事,
 * 而且每一行只有二十几像素高,戴手套按不准。这里改成自己的底部弹层,
 * 每一行 60px,超过 8 个人就多给一个搜寻框。
 */
export function OperatorPicker({ value, options, onChange }: Props) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const showSearch = options.length > 8
  const current = options.find((o) => o.name === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.name.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    if (showSearch) {
      const timer = setTimeout(() => searchRef.current?.focus(), 80)
      return () => clearTimeout(timer)
    }
  }, [open, showSearch])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 px-4 text-left ${
          value ? 'border-slate-200 bg-white' : 'border-amber-400 bg-amber-50/50'
        }`}
      >
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
            value ? 'bg-slate-900 text-white' : 'bg-amber-200 text-amber-800'
          }`}
        >
          {value ? value.trim().charAt(0).toUpperCase() : '?'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-slate-500">{t('operatorChosen')}</span>
          <span
            className={`block truncate text-[17px] font-semibold ${
              value ? 'text-slate-900' : 'text-slate-500'
            }`}
          >
            {value ? (current?.label ?? value) : t('chooseOperator')}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-[18px] text-slate-400">
          ⌄
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[88] flex items-end bg-slate-900/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-sheet-up flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-100 px-4 pt-3 pb-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
              <h2 className="text-[17px] font-semibold text-slate-900">{t('chooseOperator')}</h2>
              {showSearch ? (
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchName')}
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-3 min-h-[48px] w-full rounded-xl border-2 border-slate-200 px-3 text-[16px] focus:border-slate-900 focus:outline-none"
                />
              ) : null}
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <li className="px-2 py-8 text-center text-[15px] text-slate-500">
                  {options.length === 0 ? t('noStaffYet') : t('noMatch', { q: query })}
                </li>
              ) : (
                filtered.map((op) => {
                  const active = op.name === value
                  return (
                    <li key={op.name}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(op.name)
                          setOpen(false)
                        }}
                        className={`list-item flex min-h-[60px] w-full items-center gap-3 rounded-xl px-3 text-left active:bg-slate-100 ${
                          active ? 'bg-slate-900/5' : ''
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-bold ${
                            active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {op.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[17px] font-semibold text-slate-900">
                          {op.label}
                        </span>
                        {active ? (
                          <span aria-hidden className="shrink-0 text-[20px] text-emerald-600">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>

            <div className="shrink-0 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[52px] w-full rounded-xl bg-slate-100 text-[16px] font-semibold text-slate-700 active:bg-slate-200"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
