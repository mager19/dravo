import { Group, Ungroup } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from './store'
import { T } from './i18n'

export function GroupOptions() {
  const lang = useStore(s => s.lang)
  // shallow sobre el array filtrado: solo re-renderiza si cambia la selección
  const selectedShapes = useStore(useShallow(s => s.shapes.filter(sh => s.selectedIds.includes(sh.id))))
  const { groupShapes, ungroupShapes } = useStore.getState()
  const t = T[lang].groupOptions

  if (selectedShapes.length < 2) return null

  const groupIdSet = new Set(selectedShapes.map(s => s.groupId).filter((g): g is string => !!g))
  const allInSameGroup = groupIdSet.size === 1 && selectedShapes.every(s => s.groupId === [...groupIdSet][0])

  if (!allInSameGroup && selectedShapes.length < 2) return null

  return (
    <div
      className="flex items-center gap-1 bg-[var(--c-panel)] border border-[var(--c-border)] rounded-xl px-2 py-1.5 shadow-xl"
      onMouseDown={e => e.preventDefault()}
    >
      {!allInSameGroup && (
        <button
          onClick={() => groupShapes(selectedShapes.map(s => s.id))}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors"
          title="⌘G"
        >
          <Group size={13} />
          {t.group}
        </button>
      )}
      {allInSameGroup && (
        <button
          onClick={() => ungroupShapes([...groupIdSet][0])}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-hover)] transition-colors"
          title="⌘⇧G"
        >
          <Ungroup size={13} />
          {t.ungroup}
        </button>
      )}
    </div>
  )
}
