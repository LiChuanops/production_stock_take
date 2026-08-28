import type { ReactNode } from 'react'
import { useLang } from '../lib/i18n'

interface Props {
  open: boolean
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 自己实作的确认框。不用 window.confirm ——
 * 原生对话框会冻结整个页面,PWA 里还可能整个卡住不回应。
 */
export function Confirm({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useLang()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-slate-900/50 sm:items-center sm:justify-center" onClick={onCancel}>
      <div
        className="animate-sheet-up w-full rounded-t-2xl bg-white p-5 pb-safe sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {body ? <div className="mt-2 text-[15px] leading-relaxed text-slate-600">{body}</div> : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="min-h-[52px] rounded-xl bg-slate-100 text-[16px] font-semibold text-slate-700 active:bg-slate-200"
          >
            {cancelLabel ?? t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`min-h-[52px] rounded-xl text-[16px] font-semibold text-white ${
              danger ? 'bg-rose-600 active:bg-rose-700' : 'bg-slate-900 active:bg-slate-800'
            }`}
          >
            {confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
