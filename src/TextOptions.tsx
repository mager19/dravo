import { Bold, Italic } from 'lucide-react'
import { useStore } from './store'
import type { TextShape } from './types'

const FONTS = [
  { label: 'Sans', value: 'system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Mono', value: "'Courier New', monospace" },
  { label: 'Hand', value: 'cursive' },
  { label: 'VGA', value: "'PxPlus IBM VGA8', monospace" },
]

const SIZES = [12, 16, 20, 28, 36, 48]

export function TextOptions() {
  const {
    textFontSize, textFontFamily, textBold, textItalic,
    setTextFontSize, setTextFontFamily, setTextBold, setTextItalic,
    selectedIds, shapes, updateShape,
  } = useStore()

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedText = selectedId
    ? (shapes.find(s => s.id === selectedId && s.type === 'text') as TextShape | undefined)
    : undefined

  const applyFont = (value: string) => {
    setTextFontFamily(value)
    if (selectedText) updateShape(selectedText.id, { fontFamily: value } as Partial<TextShape>)
  }
  const applySize = (size: number) => {
    setTextFontSize(size)
    if (selectedText) updateShape(selectedText.id, { fontSize: size } as Partial<TextShape>)
  }
  const applyBold = () => {
    const next = !textBold
    setTextBold(next)
    if (selectedText) updateShape(selectedText.id, { bold: next } as Partial<TextShape>)
  }
  const applyItalic = () => {
    const next = !textItalic
    setTextItalic(next)
    if (selectedText) updateShape(selectedText.id, { italic: next } as Partial<TextShape>)
  }

  return (
    <div className="flex items-center gap-2 bg-[#22242f] border border-[#3a3d4d] rounded-xl px-3 py-1.5 shadow-xl" onMouseDown={e => e.preventDefault()}>
      <div className="flex gap-1">
        {FONTS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => applyFont(value)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              textFontFamily === value
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
            }`}
            style={{ fontFamily: value }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-[#3a3d4d]" />

      <div className="flex gap-1 items-center">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => applySize(s)}
            className={`w-7 h-6 rounded text-xs transition-colors ${
              textFontSize === s
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-[#3a3d4d]" />

      <button
        onClick={applyBold}
        className={`p-1.5 rounded transition-colors ${
          textBold ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
        }`}
        title="Negrita"
      >
        <Bold size={15} />
      </button>
      <button
        onClick={applyItalic}
        className={`p-1.5 rounded transition-colors ${
          textItalic ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
        }`}
        title="Cursiva"
      >
        <Italic size={15} />
      </button>
    </div>
  )
}
