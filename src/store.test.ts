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
import type { RectShape } from './types'

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
