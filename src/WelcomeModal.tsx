import { MousePointer2, Square, Pencil, Type, Network, Download, Braces } from 'lucide-react'
import { useStore } from './store'
import { T } from './i18n'

const TOOL_ICONS = [
  <MousePointer2 size={15} />,
  <Square size={15} />,
  <Pencil size={15} />,
  <Type size={15} />,
  <Network size={15} />,
]

export function WelcomeModal({ onClose }: { onClose: () => void }) {
  const { lang, setLang } = useStore()
  const t = T[lang].welcome

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#22242f] border border-[#3a3d4d] rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-[#3a3d4d]">
          <img src="/logo.svg" className="h-8 w-auto mb-3 opacity-95" alt="Dravo" />
          <p className="text-gray-300 text-sm leading-relaxed">{t.tagline}</p>
        </div>

        {/* Tools */}
        <div className="px-7 py-4 border-b border-[#3a3d4d]">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">{t.toolsTitle}</p>
          <ul className="flex flex-col gap-2">
            {t.toolList.map((label, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="text-blue-400 shrink-0">{TOOL_ICONS[i]}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Shortcuts */}
        <div className="px-7 py-4 border-b border-[#3a3d4d]">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">{t.shortcutsTitle}</p>
          <ul className="flex flex-col gap-1.5">
            {t.shortcuts.map(({ key, desc }) => (
              <li key={key} className="flex items-baseline gap-3 text-xs">
                <kbd className="text-[11px] font-mono bg-[#1a1b23] border border-[#3a3d4d] text-blue-300 px-1.5 py-0.5 rounded shrink-0 min-w-[60px] text-center">
                  {key}
                </kbd>
                <span className="text-gray-400">{desc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex bg-[#1a1b23] border border-[#3a3d4d] rounded-lg p-0.5">
              {(['es', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    lang === l ? 'bg-[#2e3144] text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Download size={12} className="shrink-0" />
              PNG ·
              <Braces size={12} className="shrink-0" />
              JSON
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors font-medium"
          >
            {t.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
