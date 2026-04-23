import { create } from 'zustand'
import type { CanvasState, Shape, Tool, StrokeWidth, StrokeDash, Point } from './types'
import type { Lang } from './i18n'

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
  setLang: (lang: Lang) => void

  addShape: (shape: Shape) => void
  updateShape: (id: string, patch: Partial<Shape>) => void
  deleteShape: (id: string) => void
  deleteSelectedShapes: () => void
  setShapes: (shapes: Shape[]) => void

  undo: () => void
  redo: () => void
  snapshot: () => void

  clearCanvas: () => void
}

const INITIAL_STATE: CanvasState = {
  shapes: [],
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
  lang: (localStorage.getItem('dravo:lang') as Lang | null) ?? 'es',
}

export const useStore = create<CanvasState & StoreActions>((set, get) => ({
  ...INITIAL_STATE,

  setTool: (tool) => set({ tool, selectedIds: [] }),
  setStrokeColor: (strokeColor) => {
    set({ strokeColor })
    const { selectedIds } = get()
    if (selectedIds.length) set((s) => ({ shapes: s.shapes.map(sh => selectedIds.includes(sh.id) ? { ...sh, strokeColor } as Shape : sh) }))
  },
  setFillColor: (fillColor) => {
    set({ fillColor })
    const { selectedIds } = get()
    if (selectedIds.length) set((s) => ({ shapes: s.shapes.map(sh => selectedIds.includes(sh.id) ? { ...sh, fillColor } as Shape : sh) }))
  },
  setStrokeWidth: (strokeWidth) => {
    set({ strokeWidth })
    const { selectedIds } = get()
    if (selectedIds.length) set((s) => ({ shapes: s.shapes.map(sh => selectedIds.includes(sh.id) ? { ...sh, strokeWidth } as Shape : sh) }))
  },
  setStrokeDash: (strokeDash) => {
    set({ strokeDash })
    const { selectedIds } = get()
    if (selectedIds.length) set((s) => ({ shapes: s.shapes.map(sh => selectedIds.includes(sh.id) ? { ...sh, strokeDash } as Shape : sh) }))
  },
  setOpacity: (opacity) => {
    set({ opacity })
    const { selectedIds } = get()
    if (selectedIds.length) set((s) => ({ shapes: s.shapes.map(sh => selectedIds.includes(sh.id) ? { ...sh, opacity } as Shape : sh) }))
  },
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setStageScale: (stageScale) => set({ stageScale }),
  setStagePos: (stagePos) => set({ stagePos }),
  setTextFontSize: (textFontSize) => set({ textFontSize }),
  setTextFontFamily: (textFontFamily) => set({ textFontFamily }),
  setTextBold: (textBold) => set({ textBold }),
  setTextItalic: (textItalic) => set({ textItalic }),
  setLang: (lang) => { localStorage.setItem('dravo:lang', lang); set({ lang }) },

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
    const { selectedIds } = get()
    if (!selectedIds.length) return
    get().snapshot()
    set((s) => ({ shapes: s.shapes.filter((sh) => !s.selectedIds.includes(sh.id)), selectedIds: [] }))
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

  clearCanvas: () => {
    get().snapshot()
    set({ shapes: [], selectedIds: [] })
  },
}))
