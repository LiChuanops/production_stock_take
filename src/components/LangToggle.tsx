import { useLang } from '../lib/i18n'

/** 中 / EN 切换。放在标题列,一按就换,不用重开 app。 */
export function LangToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { lang, setLang } = useLang()
  const base = 'min-h-[34px] min-w-[38px] rounded-md px-2 text-[13px] font-bold transition-colors'
  const idle = tone === 'dark' ? 'text-white/60' : 'text-slate-500'
  const active = tone === 'dark' ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-lg p-0.5 ${
        tone === 'dark' ? 'bg-white/10' : 'bg-slate-100'
      }`}
      role="group"
      aria-label="语言 Language"
    >
      <button
        onClick={() => setLang('zh')}
        aria-pressed={lang === 'zh'}
        className={`${base} ${lang === 'zh' ? active : idle}`}
      >
        中
      </button>
      <button
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`${base} ${lang === 'en' ? active : idle}`}
      >
        EN
      </button>
    </div>
  )
}
