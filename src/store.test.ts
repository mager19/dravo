import { describe, it, expect, beforeEach, vi } from 'vitest'

// store.ts lee localStorage al cargar el módulo (lang/theme); en Node no existe
vi.hoisted(() => {
  const data = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

import { useStore } from './store'
import type { RectShape, GroupShape } from './types'

function makeRect(id: string, extra: Partial<RectShape> = {}): RectShape {
  return {
    id, type: 'rect', x: 0, y: 0, width: 100, height: 50,
    strokeColor: '#3b82f6', fillColor: 'transparent',
    strokeWidth: 2, strokeDash: 'solid', opacity: 1,
    ...extra,
  }
}

beforeEach(() => {
  useStore.setState({
    shapes: [], selectedIds: [], clipboard: [], past: [], future: [],
    strokeColor: '#3b82f6', fillColor: 'transparent',
    strokeWidth: 2, strokeDash: 'solid', opacity: 1, roughEnabled: false,
  })
})

describe('undo/redo de gestos', () => {
  it('addShape es undoable', () => {
    useStore.getState().addShape(makeRect('r1'))
    expect(useStore.getState().shapes).toHaveLength(1)
    useStore.getState().undo()
    expect(useStore.getState().shapes).toHaveLength(0)
  })

  it('un gesto de drag (snapshot al inicio + updateShape al final) es undoable', () => {
    useStore.setState({ shapes: [makeRect('r1')] })
    useStore.getState().snapshot() // onDragStart
    useStore.getState().updateShape('r1', { x: 80, y: 40 })
    expect((useStore.getState().shapes[0] as RectShape).x).toBe(80)
    useStore.getState().undo()
    expect((useStore.getState().shapes[0] as RectShape).x).toBe(0)
  })

  it('updateShape solo (actualización continua dentro de un gesto) no agrega historial', () => {
    useStore.setState({ shapes: [makeRect('r1')] })
    useStore.getState().updateShape('r1', { x: 10 })
    useStore.getState().updateShape('r1', { x: 20 })
    expect(useStore.getState().past).toHaveLength(0)
  })

  it('redo reaplica lo deshecho y un snapshot nuevo limpia future', () => {
    useStore.getState().addShape(makeRect('r1'))
    useStore.getState().undo()
    useStore.getState().redo()
    expect(useStore.getState().shapes).toHaveLength(1)
    useStore.getState().undo()
    useStore.getState().addShape(makeRect('r2'))
    expect(useStore.getState().future).toHaveLength(0)
  })
})

describe('cambios de estilo sobre la selección', () => {
  it('setStrokeColor aplica a la selección y es undoable', () => {
    useStore.setState({ shapes: [makeRect('r1'), makeRect('r2')], selectedIds: ['r1'] })
    useStore.getState().setStrokeColor('#ff0000')
    const st = useStore.getState()
    expect(st.shapes[0].strokeColor).toBe('#ff0000')
    expect(st.shapes[1].strokeColor).toBe('#3b82f6')
    expect(st.past).toHaveLength(1)
    st.undo()
    expect(useStore.getState().shapes[0].strokeColor).toBe('#3b82f6')
  })

  it('re-aplicar los mismos valores no ensucia el historial (sync de pickers al seleccionar)', () => {
    useStore.setState({ shapes: [makeRect('r1')], selectedIds: ['r1'] })
    const s = useStore.getState()
    // App.tsx sincroniza los pickers con los valores del shape al seleccionarlo
    s.setStrokeColor('#3b82f6')
    s.setFillColor('transparent')
    s.setStrokeWidth(2)
    s.setStrokeDash('solid')
    s.setOpacity(1)
    s.setRoughEnabled(false)
    expect(useStore.getState().past).toHaveLength(0)
  })

  it('setRoughEnabled(false) sobre shape sin campo rough no snapshotea', () => {
    useStore.setState({ shapes: [makeRect('r1')], selectedIds: ['r1'] })
    useStore.getState().setRoughEnabled(false)
    expect(useStore.getState().past).toHaveLength(0)
    useStore.getState().setRoughEnabled(true)
    expect(useStore.getState().past).toHaveLength(1)
    expect(useStore.getState().shapes[0].rough).toBe(true)
  })

  it('sin selección, los setters de estilo no tocan shapes ni historial', () => {
    useStore.setState({ shapes: [makeRect('r1')] })
    useStore.getState().setStrokeColor('#00ff00')
    const st = useStore.getState()
    expect(st.shapes[0].strokeColor).toBe('#3b82f6')
    expect(st.past).toHaveLength(0)
    expect(st.strokeColor).toBe('#00ff00')
  })
})

describe('copy/paste/duplicate con grupos', () => {
  function setupGroup() {
    const r1 = makeRect('r1', { groupId: 'g1' })
    const r2 = makeRect('r2', { x: 200, groupId: 'g1' })
    const group = {
      id: 'g1', type: 'group' as const, childIds: ['r1', 'r2'],
      strokeColor: '#a78bfa', fillColor: 'transparent',
      strokeWidth: 1 as const, strokeDash: 'dashed' as const, opacity: 1,
    }
    useStore.setState({ shapes: [r1, r2, group] })
  }

  it('pegar un grupo completo remapea childIds y groupId a las copias', () => {
    setupGroup()
    useStore.setState({ selectedIds: ['r1', 'r2'] })
    useStore.getState().copySelected()
    useStore.getState().paste()
    const st = useStore.getState()
    const newGroup = st.shapes.find((s): s is GroupShape => s.type === 'group' && s.id !== 'g1')
    expect(newGroup).toBeDefined()
    expect(newGroup!.childIds).toEqual(st.selectedIds)
    // ningún childId apunta a shapes originales
    expect(newGroup!.childIds.includes('r1')).toBe(false)
    st.selectedIds.forEach(id => {
      expect(st.shapes.find(s => s.id === id)!.groupId).toBe(newGroup!.id)
    })
  })

  it('pegar un grupo parcial descarta el grupo y limpia groupId de la copia', () => {
    setupGroup()
    useStore.setState({ selectedIds: ['r1'] })
    useStore.getState().copySelected() // clipboard: r1 + g1 (grupo de r1)
    useStore.getState().paste()
    const st = useStore.getState()
    // el grupo pegado tendría 1 solo hijo — no debe sobrevivir
    expect(st.shapes.filter(s => s.type === 'group')).toHaveLength(1)
    const copy = st.shapes.find(s => s.id === st.selectedIds[0])!
    expect(copy.groupId).toBeUndefined()
    // el grupo original sigue intacto
    const orig = st.shapes.find((s): s is GroupShape => s.id === 'g1')
    expect(orig!.childIds).toEqual(['r1', 'r2'])
  })

  it('duplicate preserva la agrupación', () => {
    setupGroup()
    useStore.setState({ selectedIds: ['r1', 'r2'] })
    useStore.getState().duplicate()
    const st = useStore.getState()
    expect(st.shapes.filter(s => s.type === 'group')).toHaveLength(2)
    expect(st.selectedIds).toHaveLength(2)
  })
})

describe('translateShapes (drag grupal)', () => {
  it('traslada rect, line y connector por delta sin agregar historial', () => {
    const styleBase = {
      strokeColor: '#3b82f6', fillColor: 'transparent',
      strokeWidth: 2 as const, strokeDash: 'solid' as const, opacity: 1,
    }
    const line = { ...styleBase, id: 'l1', type: 'line' as const, points: [0, 0, 10, 10] }
    const conn = {
      ...styleBase, id: 'c1', type: 'connector' as const, curved: true,
      start: { shapeId: null, anchor: null, x: 0, y: 0 },
      end: { shapeId: null, anchor: null, x: 50, y: 50 },
      controlPoint: { x: 25, y: 10 },
    }
    useStore.setState({ shapes: [makeRect('r1'), line, conn] })
    useStore.getState().translateShapes(['r1', 'l1', 'c1'], 10, 5)
    const st = useStore.getState()
    expect((st.shapes[0] as RectShape).x).toBe(10)
    expect(st.shapes[1].type === 'line' && st.shapes[1].points).toEqual([10, 5, 20, 15])
    const c = st.shapes[2]
    expect(c.type === 'connector' && c.end.x).toBe(60)
    expect(c.type === 'connector' && c.controlPoint!.y).toBe(15)
    // sin snapshot: el gesto de drag lo toma en onDragStart
    expect(st.past).toHaveLength(0)
  })
})

describe('límite del historial', () => {
  it('past no crece más allá de MAX_HISTORY (100)', () => {
    useStore.setState({ shapes: [makeRect('r1')] })
    for (let i = 0; i < 150; i++) useStore.getState().snapshot()
    expect(useStore.getState().past).toHaveLength(100)
  })
})

describe('acciones que ya snapshoteaban', () => {
  it('deleteSelectedShapes y moveSelectedShapes son undoables', () => {
    useStore.setState({ shapes: [makeRect('r1')], selectedIds: ['r1'] })
    useStore.getState().moveSelectedShapes(5, 5)
    expect((useStore.getState().shapes[0] as RectShape).x).toBe(5)
    useStore.getState().deleteSelectedShapes()
    expect(useStore.getState().shapes).toHaveLength(0)
    useStore.getState().undo()
    expect(useStore.getState().shapes).toHaveLength(1)
    useStore.getState().undo()
    expect((useStore.getState().shapes[0] as RectShape).x).toBe(0)
  })
})
