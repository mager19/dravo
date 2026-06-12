import { useStore } from './store'
import type { ConnectorShape, Shape } from './types'
import { T } from './i18n'

export function ConnectorOptions() {
  const lang = useStore(s => s.lang)
  // referencia estable mientras el conector no cambie
  const conn = useStore(s => {
    const sh = s.selectedIds.length === 1 ? s.shapes.find(x => x.id === s.selectedIds[0]) : undefined
    return sh?.type === 'connector' ? (sh as ConnectorShape) : undefined
  })
  const { updateShape, snapshot } = useStore.getState()
  const t = T[lang]
  if (!conn) return null

  const toggleCurved = () => {
    snapshot()
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
