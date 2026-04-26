import { ChevronLeft, ChevronRight, Bold, Italic } from 'lucide-react'
import { useStore } from './store'
import { T } from './i18n'
import type { StrokeWidth, StrokeDash, ConnectorShape, TextShape, Shape } from './types'

const COLORS = ['#3b82f6', '#f43f5e', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#ffffff', '#94a3b8']
const WIDTHS: StrokeWidth[] = [1, 2, 4, 8]
const FONTS = [
  { label: 'Sans',  value: 'system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono',  value: "'Courier New', monospace" },
  { label: 'Hand',  value: 'cursive' },
  { label: 'VGA',   value: "'PxPlus IBM VGA8', monospace" },
]
const SIZES = [12, 16, 20, 28, 36, 48]

interface Props {
  open: boolean
  onToggle: () => void
  showTextOptions: boolean
  showConnectorOptions: boolean
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-[#3a3d4d] shrink-0" />
}

export function PropertiesPanel({ open, onToggle, showTextOptions, showConnectorOptions }: Props) {
  const {
    strokeColor, fillColor, strokeWidth, strokeDash, opacity, roughEnabled, lang,
    setStrokeColor, setFillColor, setStrokeWidth, setStrokeDash, setOpacity, setRoughEnabled,
    textFontSize, textFontFamily, textBold, textItalic,
    setTextFontSize, setTextFontFamily, setTextBold, setTextItalic,
    selectedIds, shapes, updateShape,
  } = useStore()
  const t = T[lang]
  const tc = t.colorPicker
  const ts = t.layers.shapeNames

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedText = selectedId
    ? shapes.find(s => s.id === selectedId && s.type === 'text') as TextShape | undefined
    : undefined
  const selectedConn = selectedId
    ? shapes.find(s => s.id === selectedId && s.type === 'connector') as ConnectorShape | undefined
    : undefined

  const applyFont  = (v: string) => { setTextFontFamily(v); if (selectedText) updateShape(selectedText.id, { fontFamily: v } as Partial<TextShape>) }
  const applySize  = (s: number) => { setTextFontSize(s);   if (selectedText) updateShape(selectedText.id, { fontSize: s }  as Partial<TextShape>) }
  const applyBold  = () => { const n = !textBold;   setTextBold(n);   if (selectedText) updateShape(selectedText.id, { bold: n }   as Partial<TextShape>) }
  const applyItalic = () => { const n = !textItalic; setTextItalic(n); if (selectedText) updateShape(selectedText.id, { italic: n } as Partial<TextShape>) }
  const toggleCurved = () => {
    if (selectedConn) updateShape(selectedConn.id, { curved: !selectedConn.curved, controlPoint: undefined } as Partial<Shape>)
  }

  const DASHES: { value: StrokeDash; label: string; pattern: string }[] = [
    { value: 'solid',    label: tc.solid,    pattern: '' },
    { value: 'dotted',   label: tc.dotted,   pattern: '2 4' },
    { value: 'dashed',   label: tc.dashed,   pattern: '8 5' },
    { value: 'longdash', label: tc.longdash, pattern: '16 6' },
  ]

  return (
    /* Outer: vertical centering, no overflow */
    <div className="fixed left-0 top-1/2 z-20 -translate-y-1/2 pointer-events-none">
      {/* Inner: slides horizontally */}
      <div
        className={`flex items-stretch will-change-transform transition-transform duration-300 ease-in-out pointer-events-auto ${
          open ? 'translate-x-0' : '-translate-x-52'
        }`}
      >
        {/* Panel content (w-52 = 208px) */}
        <div
          className="w-52 flex flex-col gap-3 bg-[#22242f] border border-[#3a3d4d] border-r-0 rounded-l-xl px-3 py-3 shadow-2xl overflow-y-auto scrollbar-none"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
          onMouseDown={e => e.preventDefault()}
        >
          {/* Stroke */}
          <Section label={tc.stroke}>
            <div className="flex flex-wrap gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setStrokeColor(c)}
                  className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                  style={{ background: c, borderColor: strokeColor === c ? '#fff' : 'transparent' }} />
              ))}
              <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
                className="w-4 h-4 rounded-full cursor-pointer border-0 bg-transparent p-0 shrink-0"
                title={tc.customColor} />
            </div>
          </Section>

          <Divider />

          {/* Fill */}
          <Section label={tc.fill}>
            <div className="flex flex-wrap gap-1 items-center">
              <button onClick={() => setFillColor('transparent')}
                className="w-4 h-4 rounded-full border-2 relative overflow-hidden shrink-0"
                style={{ borderColor: fillColor === 'transparent' ? '#fff' : '#555' }}
                title={tc.noFill}>
                <div className="absolute inset-0 bg-[#1a1b23]" />
                <div className="absolute inset-0 flex items-center justify-center text-red-400 font-bold" style={{ fontSize: 9 }}>×</div>
              </button>
              {COLORS.map(c => (
                <button key={c} onClick={() => setFillColor(c)}
                  className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                  style={{ background: c, borderColor: fillColor === c ? '#fff' : 'transparent' }} />
              ))}
            </div>
          </Section>

          <Divider />

          {/* Line style */}
          <Section label={tc.lineStyle}>
            <div className="flex flex-wrap gap-1">
              {DASHES.map(({ value, label, pattern }) => (
                <button key={value} title={label} onClick={() => setStrokeDash(value)}
                  className={`flex items-center justify-center w-9 h-5 rounded transition-colors ${
                    strokeDash === value ? 'bg-blue-600' : 'hover:bg-[#2e3144]'
                  }`}>
                  <svg width="22" height="4" viewBox="0 0 22 4">
                    <line x1="1" y1="2" x2="21" y2="2" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeDasharray={pattern || undefined}
                      className={strokeDash === value ? 'text-white' : 'text-gray-400'} />
                  </svg>
                </button>
              ))}
              <button title={tc.rough} onClick={() => setRoughEnabled(!roughEnabled)}
                className={`flex items-center justify-center w-9 h-5 rounded transition-colors ${
                  roughEnabled ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#2e3144]'
                }`}>
                <svg width="22" height="8" viewBox="0 0 22 8">
                  <path d="M1 4 C3 1, 5 7, 7 4 C9 1, 11 7, 13 4 C15 1, 17 7, 19 4 C20 2.5, 21 3, 21 4"
                    stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </Section>

          <Divider />

          {/* Width */}
          <Section label={tc.width}>
            <div className="flex gap-1">
              {WIDTHS.map(w => (
                <button key={w} onClick={() => setStrokeWidth(w)}
                  className={`flex items-center justify-center w-9 h-6 rounded text-xs transition-colors ${
                    strokeWidth === w ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#2e3144]'
                  }`}>
                  {w}
                </button>
              ))}
            </div>
          </Section>

          {/* Opacity */}
          <Section label={`${tc.opacity}  ${Math.round(opacity * 100)}%`}>
            <input type="range" min={0} max={1} step={0.05} value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-full h-1.5 accent-blue-500 cursor-pointer" />
          </Section>

          {/* Text options (contextual) */}
          {showTextOptions && (
            <>
              <Divider />
              <Section label={ts.text}>
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {FONTS.map(({ label, value }) => (
                    <button key={value} onClick={() => applyFont(value)}
                      className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                        textFontFamily === value ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
                      }`}
                      style={{ fontFamily: value }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {SIZES.map(s => (
                    <button key={s} onClick={() => applySize(s)}
                      className={`w-8 h-5 rounded text-xs transition-colors ${
                        textFontSize === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={applyBold} title={t.textOptions.bold}
                    className={`p-1 rounded transition-colors ${
                      textBold ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
                    }`}>
                    <Bold size={13} />
                  </button>
                  <button onClick={applyItalic} title={t.textOptions.italic}
                    className={`p-1 rounded transition-colors ${
                      textItalic ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
                    }`}>
                    <Italic size={13} />
                  </button>
                </div>
              </Section>
            </>
          )}

          {/* Connector options (contextual) */}
          {showConnectorOptions && selectedConn && (
            <>
              <Divider />
              <Section label={ts.connector}>
                <button onClick={toggleCurved}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors w-fit ${
                    selectedConn.curved ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
                  }`}>
                  {selectedConn.curved ? '⌒' : '—'}
                  <span>{selectedConn.curved ? t.connectorOptions.curved : t.connectorOptions.straight}</span>
                </button>
              </Section>
            </>
          )}
        </div>

        {/* Toggle tab — always at left edge when closed */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-4 shrink-0 bg-[#22242f] border border-l-0 border-[#3a3d4d] rounded-r-lg shadow-xl text-gray-500 hover:text-white transition-colors"
          style={{ minHeight: 48 }}
        >
          {open ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
        </button>
      </div>
    </div>
  )
}
