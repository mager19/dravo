import { create } from 'zustand'
import type { CanvasState, Shape, Tool, Theme, StrokeWidth, StrokeDash, Point, AnchorPoint, ConnectorShape, GroupShape } from './types'
import type { Lang } from './i18n'
import { nanoid } from './utils'

let _pasteCount = 0

function cloneWithOffset(shape: Shape, offset: number, idMap: Map<string, string>): Shape {
  const newId = idMap.get(shape.id)!
  const newGroupId = shape.groupId && idMap.has(shape.groupId) ? idMap.get(shape.groupId) : shape.groupId
  if (shape.type === 'group') {
    return { ...shape, id: newId, groupId: newGroupId, childIds: shape.childIds.map(cid => idMap.get(cid) ?? cid) }
  }
  if (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'text') {
    return { ...shape, id: newId, groupId: newGroupId, x: shape.x + offset, y: shape.y + offset }
  }
  if (shape.type === 'line' || shape.type === 'arrow') {
    return { ...shape, id: newId, groupId: newGroupId, points: shape.points.map(v => v + offset) }
  }
  if (shape.type === 'freehand') {
    return { ...shape, id: newId, groupId: newGroupId, points: shape.points.map(([x, y, p]) => [x + offset, y + offset, p]) }
  }
  if (shape.type === 'connector') {
    const remapAnchor = (a: AnchorPoint): AnchorPoint => ({
      ...a,
      shapeId: a.shapeId && idMap.has(a.shapeId) ? idMap.get(a.shapeId)! : null,
      anchor: a.shapeId && idMap.has(a.shapeId) ? a.anchor : null,
      x: a.x + offset,
      y: a.y + offset,
    })
    const conn = shape as ConnectorShape
    return {
      ...conn,
      id: newId,
      groupId: newGroupId,
      start: remapAnchor(conn.start),
      end: remapAnchor(conn.end),
      controlPoint: conn.controlPoint
        ? { x: conn.controlPoint.x + offset, y: conn.controlPoint.y + offset }
        : undefined,
    }
  }
  return { ...(shape as Record<string, unknown>), id: newId, groupId: newGroupId } as Shape
}

interface StoreActions {
  setTool: (tool: Tool) => void
  setStrokeColor: (color: string) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (width: StrokeWidth) => void
  setStrokeDash: (dash: StrokeDash) => void
  setOpacity: (opacity: number) => void
  setSelectedIds: (ids: string[]) => void
  setStageScale: (scale: number) => void
  setStagePos: (pos: Point) => void
  setTextFontSize: (size: number) => void
  setTextFontFamily: (family: string) => void
  setTextBold: (bold: boolean) => void
  setTextItalic: (italic: boolean) => void
  setIsLabelEditing: (v: boolean) => void
  setRoughEnabled: (v: boolean) => void
  setLang: (lang: Lang) => void
  setTheme: (theme: Theme) => void

  addShape: (shape: Shape) => void
  updateShape: (id: string, patch: Partial<Shape>) => void
  deleteShape: (id: string) => void
  deleteSelectedShapes: () => void
  setShapes: (shapes: Shape[]) => void

  undo: () => void
  redo: () => void
  snapshot: () => void

  copySelected: () => void
  paste: () => void
  duplicate: () => void

  groupShapes: (ids: string[]) => void
  ungroupShapes: (groupId: string) => void

  setGridEnabled: (v: boolean) => void
  clearCanvas: () => void
  moveSelectedShapes: (dx: number, dy: number) => void
}

const INITIAL_STATE: CanvasState = {
  shapes: [],
  clipboard: [],
  selectedIds: [],
  tool: 'select',
  strokeColor: '#3b82f6',
  fillColor: 'transparent',
  strokeWidth: 2,
  strokeDash: 'solid',
  opacity: 1,
  stageScale: 1,
  stagePos: { x: 0, y: 0 },
  past: [],
  future: [],
  textFontSize: 18,
  textFontFamily: 'system-ui, sans-serif',
  textBold: false,
  textItalic: false,
  isLabelEditing: false,
  roughEnabled: false,
  gridEnabled: false,
  lang: (localStorage.getItem('dravo:lang') as Lang | null) ?? 'es',
  theme: (localStorage.getItem('dravo:theme') as Theme | null) ?? 'dark',
}

export const useStore = create<CanvasState & StoreActions>((set, get) => {
  // Aplica un patch de estilo a la selección de forma undoable.
  // No hace nada si ningún shape seleccionado cambia realmente — así la
  // sincronización de pickers al seleccionar (App.tsx) no ensucia el historial.
  const applyStyleToSelection = (patch: Partial<Shape>, differs: (sh: Shape) => boolean) => {
    const { selectedIds, shapes } = get()
    if (!selectedIds.length) return
    if (!shapes.some(sh => selectedIds.includes(sh.id) && differs(sh))) return
    get().snapshot()
    set((s) => ({ shapes: s.shapes.map(sh => selectedIds.includes(sh.id) ? { ...sh, ...patch } as Shape : sh) }))
  }

  return {
  ...INITIAL_STATE,

  setTool: (tool) => set({ tool, selectedIds: [] }),
  setStrokeColor: (strokeColor) => {
    set({ strokeColor })
    applyStyleToSelection({ strokeColor }, sh => sh.strokeColor !== strokeColor)
  },
  setFillColor: (fillColor) => {
    set({ fillColor })
    applyStyleToSelection({ fillColor }, sh => sh.fillColor !== fillColor)
  },
  setStrokeWidth: (strokeWidth) => {
    set({ strokeWidth })
    applyStyleToSelection({ strokeWidth }, sh => sh.strokeWidth !== strokeWidth)
  },
  setStrokeDash: (strokeDash) => {
    set({ strokeDash })
    applyStyleToSelection({ strokeDash }, sh => sh.strokeDash !== strokeDash)
  },
  setOpacity: (opacity) => {
    set({ opacity })
    applyStyleToSelection({ opacity }, sh => sh.opacity !== opacity)
  },
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setStageScale: (stageScale) => set({ stageScale }),
  setStagePos: (stagePos) => set({ stagePos }),
  setTextFontSize: (textFontSize) => set({ textFontSize }),
  setTextFontFamily: (textFontFamily) => set({ textFontFamily }),
  setTextBold: (textBold) => set({ textBold }),
  setTextItalic: (textItalic) => set({ textItalic }),
  setIsLabelEditing: (isLabelEditing) => set({ isLabelEditing }),
  setRoughEnabled: (roughEnabled) => {
    set({ roughEnabled })
    applyStyleToSelection({ rough: roughEnabled }, sh => (sh.rough ?? false) !== roughEnabled)
  },
  setLang: (lang) => { localStorage.setItem('dravo:lang', lang); set({ lang }) },
  setTheme: (theme) => { localStorage.setItem('dravo:theme', theme); document.documentElement.setAttribute('data-theme', theme); set({ theme }) },

  snapshot: () => {
    const { shapes, past } = get()
    set({ past: [...past, shapes], future: [] })
  },

  addShape: (shape) => {
    get().snapshot()
    set((s) => ({ shapes: [...s.shapes, shape] }))
  },

  updateShape: (id, patch) => {
    set((s) => ({
      shapes: s.shapes.map((sh) => (sh.id === id ? ({ ...sh, ...patch } as Shape) : sh)),
    }))
  },

  deleteShape: (id) => {
    get().snapshot()
    set((s) => ({ shapes: s.shapes.filter((sh) => sh.id !== id), selectedIds: s.selectedIds.filter(sid => sid !== id) }))
  },

  deleteSelectedShapes: () => {
    const { selectedIds, shapes } = get()
    if (!selectedIds.length) return
    get().snapshot()
    const affectedGroupIds = new Set(
      selectedIds.map(id => shapes.find(s => s.id === id)?.groupId).filter((g): g is string => !!g)
    )
    let next = shapes.filter(sh => !selectedIds.includes(sh.id))
    affectedGroupIds.forEach(gid => {
      const remaining = next.filter(s => s.groupId === gid)
      if (remaining.length < 2) {
        next = next
          .filter(s => s.id !== gid)
          .map(s => s.groupId === gid ? { ...s, groupId: undefined } as Shape : s)
      }
    })
    set({ shapes: next, selectedIds: [] })
  },

  setShapes: (shapes) => set({ shapes }),

  undo: () => {
    const { past, shapes, future } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    set({ past: past.slice(0, -1), shapes: prev, future: [shapes, ...future] })
  },

  redo: () => {
    const { future, shapes, past } = get()
    if (!future.length) return
    const next = future[0]
    set({ future: future.slice(1), shapes: next, past: [...past, shapes] })
  },

  copySelected: () => {
    const { shapes, selectedIds } = get()
    if (!selectedIds.length) return
    const selected = shapes.filter(s => selectedIds.includes(s.id))
    const groupIds = new Set(selected.map(s => s.groupId).filter((g): g is string => !!g))
    const groups = shapes.filter(s => s.type === 'group' && groupIds.has(s.id))
    set({ clipboard: [...selected, ...groups] })
    _pasteCount = 0
  },

  paste: () => {
    const { clipboard } = get()
    if (!clipboard.length) return
    _pasteCount++
    const offset = _pasteCount * 10
    const idMap = new Map(clipboard.map(s => [s.id, nanoid()]))
    const newShapes = clipboard.map(s => cloneWithOffset(s, offset, idMap))
    get().snapshot()
    const nonGroupIds = newShapes.filter(s => s.type !== 'group').map(s => s.id)
    set(state => ({ shapes: [...state.shapes, ...newShapes], selectedIds: nonGroupIds }))
  },

  duplicate: () => {
    const { shapes, selectedIds } = get()
    if (!selectedIds.length) return
    set({ clipboard: shapes.filter(s => selectedIds.includes(s.id)) })
    _pasteCount = 0
    get().paste()
  },

  groupShapes: (ids) => {
    if (ids.length < 2) return
    const { shapes } = get()
    const oldGroupIds = new Set(ids.map(id => shapes.find(s => s.id === id)?.groupId).filter((g): g is string => !!g))
    get().snapshot()
    const gid = nanoid()
    const group: GroupShape = {
      id: gid, type: 'group', childIds: [...ids],
      strokeColor: '#a78bfa', fillColor: 'transparent',
      strokeWidth: 1 as StrokeWidth, strokeDash: 'dashed' as StrokeDash, opacity: 1,
    }
    let next = shapes.map(sh => ids.includes(sh.id) ? { ...sh, groupId: gid } as Shape : sh)
    oldGroupIds.forEach(ogid => {
      const remaining = next.filter(s => s.groupId === ogid)
      if (remaining.length < 2) {
        next = next
          .filter(s => s.id !== ogid)
          .map(s => s.groupId === ogid ? { ...s, groupId: undefined } as Shape : s)
      }
    })
    set({ shapes: [...next, group], selectedIds: ids })
  },

  ungroupShapes: (groupId) => {
    const { shapes } = get()
    const group = shapes.find(s => s.id === groupId) as GroupShape | undefined
    if (!group) return
    get().snapshot()
    set((s) => ({
      shapes: s.shapes
        .filter(sh => sh.id !== groupId)
        .map(sh => sh.groupId === groupId ? { ...sh, groupId: undefined } as Shape : sh),
      selectedIds: group.childIds,
    }))
  },

  setGridEnabled: (gridEnabled) => set({ gridEnabled }),

  moveSelectedShapes: (dx, dy) => {
    const { selectedIds } = get()
    if (!selectedIds.length) return
    get().snapshot()
    set((s) => ({
      shapes: s.shapes.map((sh) => {
        if (!selectedIds.includes(sh.id)) return sh
        if (sh.type === 'rect' || sh.type === 'ellipse' || sh.type === 'text')
          return { ...sh, x: sh.x + dx, y: sh.y + dy }
        if (sh.type === 'line' || sh.type === 'arrow')
          return { ...sh, points: sh.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) }
        if (sh.type === 'freehand')
          return { ...sh, points: sh.points.map(([x, y, p]) => [x + dx, y + dy, p]) }
        if (sh.type === 'connector') {
          const conn = sh
          return {
            ...conn,
            start: { ...conn.start, x: conn.start.x + dx, y: conn.start.y + dy },
            end: { ...conn.end, x: conn.end.x + dx, y: conn.end.y + dy },
            controlPoint: conn.controlPoint
              ? { x: conn.controlPoint.x + dx, y: conn.controlPoint.y + dy }
              : undefined,
          }
        }
        return sh
      }),
    }))
  },

  clearCanvas: () => {
    get().snapshot()
    set({ shapes: [], selectedIds: [] })
  },
  }
})
