import { useStore } from './store'
import type { ConnectorShape, Shape } from './types'
import { T } from './i18n'

export function ConnectorOptions() {
  const { shapes, selectedIds, updateShape, lang } = useStore()
  const t = T[lang]
  const shape = selectedIds.length === 1 ? shapes.find(s => s.id === selectedIds[0]) : null
  if (!shape || shape.type !== 'connector') return null
  const conn = shape as ConnectorShape

  const toggleCurved = () => {
    updateShape(conn.id, {
      curved: !conn.curved,
      controlPoint: undefined,
    } as Partial<Shape>)
  }

  return (
    <div
      className="flex items-center gap-1 bg-[var(--c-panel)] border border-[var(--c-border)] rounded-xl px-2 py-1.5 shadow-xl"
      onMouseDown={e => e.preventDefault()}
    >
      <button
        onClick={toggleCurved}
        className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg transition-colors ${
          conn.curved
            ? 'bg-blue-600 text-white'
            : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-hover)]'
        }`}
        title={conn.curved ? t.connectorOptions.straight : t.connectorOptions.curved}
      >
        {conn.curved ? '⌒' : '—'}
        <span className="text-xs">{conn.curved ? t.connectorOptions.curved : t.connectorOptions.straight}</span>
      </button>
    </div>
  )
}
