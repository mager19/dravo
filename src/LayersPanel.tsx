import { Square, Circle, Minus, ArrowRight, Pencil, Type, Network, Copy, Trash2, X, BoxSelect } from 'lucide-react'
import { useStore } from './store'
import { T } from './i18n'
import type { Shape, GroupShape } from './types'

function shapeIcon(type: Shape['type']) {
  const s = 12
  switch (type) {
    case 'rect':      return <Square size={s} />
    case 'ellipse':   return <Circle size={s} />
    case 'line':      return <Minus size={s} />
    case 'arrow':     return <ArrowRight size={s} />
    case 'freehand':  return <Pencil size={s} />
    case 'text':      return <Type size={s} />
    case 'connector': return <Network size={s} />
    case 'group':     return <BoxSelect size={s} />
  }
}

export function LayersPanel({ onClose }: { onClose: () => void }) {
  const { shapes, selectedIds, setSelectedIds, lang } = useStore()
  const t = T[lang].layers

  const getLabel = (shape: Shape): string => {
    if (shape.type === 'group') return `${t.shapeNames.group} (${shape.childIds.length})`
    const base = t.shapeNames[shape.type]
    if (shape.type === 'text') return shape.text.slice(0, 24) || base
    if (shape.type === 'rect' || shape.type === 'ellipse') return shape.label ? `${base}: ${shape.label}` : base
    if (shape.type === 'connector') return shape.label ? `${base}: ${shape.label}` : base
    return base
  }

  const handleSelect = (id: string, e: React.MouseEvent) => {
    const store = useStore.getState()
    const shape = store.shapes.find(s => s.id === id)
    if (!shape) return
    // grupos y sus miembros se seleccionan como unidad — nunca miembros sueltos
    const unit = shape.type === 'group'
      ? (shape as GroupShape).childIds
      : shape.groupId
        ? store.shapes.filter(s => s.groupId === shape.groupId).map(s => s.id)
        : [id]
    if (e.shiftKey) {
      const cur = store.selectedIds
      const allIn = unit.every(uid => cur.includes(uid))
      setSelectedIds(allIn
        ? cur.filter(x => !unit.includes(x))
        : [...new Set([...cur, ...unit])])
    } else {
      setSelectedIds(unit)
    }
  }

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const store = useStore.getState()
    store.setSelectedIds([id])
    store.duplicate()
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const store = useStore.getState()
    store.setSelectedIds([id])
    store.deleteSelectedShapes()
  }

  const reversed = [...shapes].reverse()

  return (
    <div className="fixed right-3 top-3 z-30 flex flex-col w-56 max-h-[calc(100vh-140px)] bg-[var(--c-panel)] border border-[var(--c-border)] rounded-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--c-border)] shrink-0">
        <span className="text-[11px] text-[var(--c-muted)] uppercase tracking-wider font-medium">
          {t.title}
          <span className="ml-1.5 text-[var(--c-subtle)] normal-case tracking-normal">({shapes.length})</span>
        </span>
        <button
          onClick={onClose}
          className="text-[var(--c-subtle)] hover:text-[var(--c-text)] transition-colors p-0.5 rounded"
        >
          <X size={14} />
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 py-1 scrollbar-none">
        {shapes.length === 0 ? (
          <p className="text-[var(--c-subtle)] text-xs text-center py-8">{t.empty}</p>
        ) : (
          reversed.map((shape) => {
            const isSelected = shape.type === 'group'
              ? (shape as GroupShape).childIds.some(cid => selectedIds.includes(cid))
              : selectedIds.includes(shape.id)
            const isGroupMember = !!shape.groupId
            return (
              <div
                key={shape.id}
                className={`flex items-center gap-2 py-1.5 mx-1 rounded-lg cursor-pointer group select-none ${
                  isGroupMember ? 'pl-5 pr-2' : 'px-2'
                } ${
                  isSelected
                    ? 'bg-blue-600/20 text-[var(--c-text)]'
                    : 'text-[var(--c-muted)] hover:bg-[var(--c-hover)] hover:text-[var(--c-text)]'
                }`}
                onClick={(e) => handleSelect(shape.id, e)}
              >
                {/* Type icon */}
                <span className="shrink-0 opacity-60">{shapeIcon(shape.type)}</span>

                {/* Color dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/20"
                  style={{ background: shape.strokeColor }}
                />

                {/* Name */}
                <span className="text-xs flex-1 truncate leading-tight">{getLabel(shape)}</span>

                {/* Actions (visible on hover or when selected) */}
                <div className={`flex gap-0.5 shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button
                    onClick={(e) => handleDuplicate(shape.id, e)}
                    className="p-1 rounded hover:bg-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                    title={t.duplicate}
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(shape.id, e)}
                    className="p-1 rounded hover:bg-red-500/20 text-[var(--c-muted)] hover:text-red-400 transition-colors"
                    title={t.delete}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
