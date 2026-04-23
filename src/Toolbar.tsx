import { useEffect } from 'react'
import {
  MousePointer2, Square, Circle, Minus, ArrowRight,
  Pencil, Type, Trash2, Undo2, Redo2, FilePlus, Network, Download, Braces, HelpCircle,
} from 'lucide-react'
import Konva from 'konva'
import { useStore } from './store'
import { T } from './i18n'
import { Tooltip } from './Tooltip'
import type { Tool } from './types'

export function Toolbar({ onOpenJson, onOpenHelp }: { onOpenJson: () => void; onOpenHelp: () => void }) {
  const { tool, setTool, undo, redo, clearCanvas, deleteSelectedShapes, lang, setLang } = useStore()
  const t = T[lang]

  const TOOLS: { tool: Tool; icon: React.ReactNode; label: string; shortcut?: string; mobileHide?: boolean }[] = [
    { tool: 'select',    icon: <MousePointer2 size={18} />, label: t.tools.select,    shortcut: 'V' },
    { tool: 'rect',      icon: <Square size={18} />,        label: t.tools.rect,      shortcut: 'R' },
    { tool: 'ellipse',   icon: <Circle size={18} />,        label: t.tools.ellipse,   shortcut: 'O' },
    { tool: 'line',      icon: <Minus size={18} />,         label: t.tools.line,      shortcut: 'L',  mobileHide: true },
    { tool: 'arrow',     icon: <ArrowRight size={18} />,    label: t.tools.arrow,     shortcut: 'A',  mobileHide: true },
    { tool: 'freehand',  icon: <Pencil size={18} />,        label: t.tools.freehand,  shortcut: 'D' },
    { tool: 'text',      icon: <Type size={18} />,          label: t.tools.text,      shortcut: 'T' },
    { tool: 'connector', icon: <Network size={18} />,       label: t.tools.connector, shortcut: 'C',  mobileHide: true },
    { tool: 'delete',    icon: <Trash2 size={18} />,        label: t.tools.delete,    mobileHide: true },
  ]

  const handleNew = () => {
    if (confirm(t.toolbar.confirmClear)) {
      clearCanvas()
      localStorage.removeItem('dravo:shapes')
    }
  }

  const handleExport = () => {
    const stage = Konva.stages[0]
    if (!stage) return
    const dataURL = stage.toDataURL({ pixelRatio: 2 })
    const a = document.createElement('a')
    a.href = dataURL
    a.download = t.toolbar.exportFile
    a.click()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds } = useStore.getState()
        if (selectedIds.length) { e.preventDefault(); deleteSelectedShapes() }
        return
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); return }
      }
      const map: Record<string, Tool> = { v: 'select', r: 'rect', o: 'ellipse', l: 'line', a: 'arrow', d: 'freehand', t: 'text', c: 'connector' }
      const k = map[e.key.toLowerCase()]
      if (k) setTool(k)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTool, undo, redo, deleteSelectedShapes])

  return (
    <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible scrollbar-none flex items-center gap-1 bg-[#22242f] border border-[#3a3d4d] rounded-xl px-2 py-1.5 shadow-xl">
      <img src="/logo.svg" className="h-6 sm:h-7 w-auto mr-1 opacity-90 shrink-0" alt="Dravo" />

      {TOOLS.map(({ tool: t_, icon, label, shortcut, mobileHide }) => (
        <Tooltip key={t_} label={label} shortcut={shortcut}>
          <button
            onClick={() => setTool(t_)}
            className={`shrink-0 p-2.5 sm:p-2 rounded-lg transition-colors ${mobileHide ? 'hidden sm:flex' : 'flex'} items-center justify-center ${
              tool === t_ ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
            }`}
          >
            {icon}
          </button>
        </Tooltip>
      ))}

      <div className="w-px h-6 bg-[#3a3d4d] mx-1 shrink-0" />

      <Tooltip label={t.toolbar.newCanvas}>
        <button onClick={handleNew}
          className="shrink-0 hidden sm:flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
          <FilePlus size={18} />
        </button>
      </Tooltip>

      <Tooltip label={t.toolbar.exportPng}>
        <button onClick={handleExport}
          className="shrink-0 p-2.5 sm:p-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
          <Download size={18} />
        </button>
      </Tooltip>

      <Tooltip label={t.toolbar.exportJson}>
        <button onClick={onOpenJson}
          className="shrink-0 hidden sm:flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
          <Braces size={18} />
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-[#3a3d4d] mx-1 shrink-0" />

      <Tooltip label={t.toolbar.undo} shortcut="⌘Z">
        <button onClick={undo}
          className="shrink-0 p-2.5 sm:p-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
          <Undo2 size={18} />
        </button>
      </Tooltip>

      <Tooltip label={t.toolbar.redo} shortcut="⌘⇧Z">
        <button onClick={redo}
          className="shrink-0 p-2.5 sm:p-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
          <Redo2 size={18} />
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-[#3a3d4d] mx-1 shrink-0" />

      <div className="flex shrink-0">
        {(['es', 'en'] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors ${
              lang === l ? 'text-white' : 'text-gray-600 hover:text-gray-400'
            }`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[#3a3d4d] mx-1 shrink-0" />

      <Tooltip label={t.toolbar.help}>
        <button onClick={onOpenHelp}
          className="shrink-0 p-2.5 sm:p-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
          <HelpCircle size={18} />
        </button>
      </Tooltip>
    </div>
  )
}
