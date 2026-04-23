import { useStore } from './store'
import { T } from './i18n'
import type { StrokeWidth, StrokeDash } from './types'

const COLORS = ['#3b82f6', '#f43f5e', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#ffffff', '#94a3b8']
const WIDTHS: StrokeWidth[] = [1, 2, 4, 8]

export function ColorPicker() {
  const { strokeColor, fillColor, strokeWidth, strokeDash, opacity, roughEnabled, lang,
    setStrokeColor, setFillColor, setStrokeWidth, setStrokeDash, setOpacity, setRoughEnabled } = useStore()
  const t = T[lang].colorPicker

  const DASHES: { value: StrokeDash; label: string; pattern: string }[] = [
    { value: 'solid',    label: t.solid,    pattern: '' },
    { value: 'dotted',   label: t.dotted,   pattern: '2 4' },
    { value: 'dashed',   label: t.dashed,   pattern: '8 5' },
    { value: 'longdash', label: t.longdash, pattern: '16 6' },
  ]

  return (
    <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible scrollbar-none flex items-center gap-2 sm:gap-3 bg-[#22242f] border border-[#3a3d4d] rounded-xl px-3 sm:px-4 py-2 shadow-xl">

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide hidden sm:block">{t.stroke}</span>
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setStrokeColor(c)}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
              style={{ background: c, borderColor: strokeColor === c ? '#fff' : 'transparent' }} />
          ))}
          <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)}
            className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent p-0 shrink-0"
            title={t.customColor} />
        </div>
      </div>

      <div className="w-px h-6 bg-[#3a3d4d] shrink-0" />

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide hidden sm:block">{t.fill}</span>
        <div className="flex gap-1 items-center">
          <button onClick={() => setFillColor('transparent')}
            className="w-5 h-5 rounded-full border-2 relative overflow-hidden shrink-0"
            style={{ borderColor: fillColor === 'transparent' ? '#fff' : '#555' }}
            title={t.noFill}>
            <div className="absolute inset-0 bg-[#1a1b23]" />
            <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs font-bold">×</div>
          </button>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setFillColor(c)}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
              style={{ background: c, borderColor: fillColor === c ? '#fff' : 'transparent' }} />
          ))}
        </div>
      </div>

      <div className="w-px h-6 bg-[#3a3d4d] shrink-0" />

      <div className="hidden sm:flex flex-col gap-1 shrink-0">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">{t.lineStyle}</span>
        <div className="flex gap-1 items-center">
          {DASHES.map(({ value, label, pattern }) => (
            <button key={value} title={label} onClick={() => setStrokeDash(value)}
              className={`flex items-center justify-center w-8 h-5 rounded transition-colors ${
                strokeDash === value ? 'bg-blue-600' : 'hover:bg-[#2e3144]'
              }`}>
              <svg width="22" height="4" viewBox="0 0 22 4">
                <line x1="1" y1="2" x2="21" y2="2" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeDasharray={pattern || undefined}
                  className={strokeDash === value ? 'text-white' : 'text-gray-400'} />
              </svg>
            </button>
          ))}
          <button title={t.rough} onClick={() => setRoughEnabled(!roughEnabled)}
            className={`flex items-center justify-center w-8 h-5 rounded transition-colors text-xs font-medium ${
              roughEnabled ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#2e3144]'
            }`}>
            <svg width="22" height="8" viewBox="0 0 22 8">
              <path d="M1 4 C3 1, 5 7, 7 4 C9 1, 11 7, 13 4 C15 1, 17 7, 19 4 C20 2.5, 21 3, 21 4"
                stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="hidden sm:block w-px h-6 bg-[#3a3d4d] shrink-0" />

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide hidden sm:block">{t.width}</span>
        <div className="flex gap-1 items-center">
          {WIDTHS.map((w) => (
            <button key={w} onClick={() => setStrokeWidth(w)}
              className={`flex items-center justify-center w-7 h-5 rounded text-xs transition-colors shrink-0 ${
                strokeWidth === w ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#2e3144]'
              }`}>
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-6 bg-[#3a3d4d] shrink-0" />

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide hidden sm:block">
          {t.opacity} <span className="text-gray-400">{Math.round(opacity * 100)}%</span>
        </span>
        <input type="range" min={0} max={1} step={0.05} value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-16 sm:w-24 h-1.5 accent-blue-500 cursor-pointer" />
      </div>
    </div>
  )
}
