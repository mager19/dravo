import { useEffect } from 'react'
import {
  MousePointer2, Square, Circle, Minus, ArrowRight,
  Pencil, Type, Trash2, Undo2, Redo2, FilePlus, Network, Download, Braces,
} from 'lucide-react'
import Konva from 'konva'
import { useStore } from './store'
import { T } from './i18n'
import type { Tool } from './types'

export function Toolbar({ onOpenJson }: { onOpenJson: () => void }) {
  const { tool, setTool, undo, redo, clearCanvas, deleteShape, lang, setLang } = useStore()
  const t = T[lang]

  const TOOLS: { tool: Tool; icon: React.ReactNode; title: string; mobileHide?: boolean }[] = [
    { tool: 'select',    icon: <MousePointer2 size={18} />, title: t.tools.select },
    { tool: 'rect',      icon: <Square size={18} />,        title: t.tools.rect },
    { tool: 'ellipse',   icon: <Circle size={18} />,        title: t.tools.ellipse },
    { tool: 'line',      icon: <Minus size={18} />,         title: t.tools.line,      mobileHide: true },
    { tool: 'arrow',     icon: <ArrowRight size={18} />,    title: t.tools.arrow,     mobileHide: true },
    { tool: 'freehand',  icon: <Pencil size={18} />,        title: t.tools.freehand },
    { tool: 'text',      icon: <Type size={18} />,          title: t.tools.text },
    { tool: 'connector', icon: <Network size={18} />,       title: t.tools.connector, mobileHide: true },
    { tool: 'delete',    icon: <Trash2 size={18} />,        title: t.tools.delete,    mobileHide: true },
  ]

  const handleNew = () => {
    if (confirm(t.toolbar.confirmClear)) {
      clearCanvas()
      localStorage.removeItem('linia:shapes')
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
        const { selectedId } = useStore.getState()
        if (selectedId) { e.preventDefault(); deleteShape(selectedId) }
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
  }, [setTool, undo, redo, deleteShape])

  return (
    <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible scrollbar-none flex items-center gap-1 bg-[#22242f] border border-[#3a3d4d] rounded-xl px-2 py-1.5 shadow-xl">
      <img src="/logo.svg" className="h-6 sm:h-7 w-auto mr-1 opacity-90 shrink-0" alt="Dravo" />

      {TOOLS.map(({ tool: t, icon, title, mobileHide }) => (
        <button
          key={t}
          title={title}
          onClick={() => setTool(t)}
          className={`shrink-0 p-2.5 sm:p-2 rounded-lg transition-colors ${mobileHide ? 'hidden sm:flex' : 'flex'} items-center justify-center ${
            tool === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#2e3144]'
          }`}
        >
          {icon}
        </button>
      ))}

      <div className="w-px h-6 bg-[#3a3d4d] mx-1 shrink-0" />

      <button title={t.toolbar.newCanvas} onClick={handleNew}
        className="shrink-0 hidden sm:flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
        <FilePlus size={18} />
      </button>
      <button title={t.toolbar.exportPng} onClick={handleExport}
        className="shrink-0 p-2.5 sm:p-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
        <Download size={18} />
      </button>
      <button title={t.toolbar.exportJson} onClick={onOpenJson}
        className="shrink-0 hidden sm:flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
        <Braces size={18} />
      </button>

      <div className="w-px h-6 bg-[#3a3d4d] mx-1 shrink-0" />

      <button title={t.toolbar.undo} onClick={undo}
        className="shrink-0 p-2.5 sm:p-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
        <Undo2 size={18} />
      </button>
      <button title={t.toolbar.redo} onClick={redo}
        className="shrink-0 p-2.5 sm:p-2 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2e3144] transition-colors">
        <Redo2 size={18} />
      </button>

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
    </div>
  )
}
