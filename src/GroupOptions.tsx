import { Group, Ungroup } from 'lucide-react'
import { useStore } from './store'
import { T } from './i18n'

export function GroupOptions() {
  const { shapes, selectedIds, groupShapes, ungroupShapes, lang } = useStore()
  const t = T[lang].groupOptions

  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id))
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
          onClick={() => groupShapes(selectedIds)}
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
