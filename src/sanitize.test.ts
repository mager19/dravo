import { describe, it, expect } from 'vitest'
import { sanitizeShapes } from './sanitize'
import type { Shape, RectShape, EllipseShape, ConnectorShape, TextShape, FreehandShape, GroupShape, LineShape, ArrowShape } from './types'

// Simula exportar a JSON y volver a importar
function roundTrip(shapes: Shape[]): Shape[] {
  return sanitizeShapes(JSON.parse(JSON.stringify(shapes)))
}

const base = {
  strokeColor: '#3b82f6',
  fillColor: 'transparent',
  strokeWidth: 2,
  strokeDash: 'solid',
  opacity: 1,
} as const

describe('round-trip export → import', () => {
  it('preserva rect con label y estilos de etiqueta', () => {
    const rect: RectShape = {
      ...base, id: 'r1', type: 'rect', x: 10, y: 20, width: 100, height: 50,
      label: 'Inicio', labelFontSize: 24, labelFontFamily: 'monospace',
      labelBold: true, labelItalic: true,
    }
    expect(roundTrip([rect])).toEqual([rect])
  })

  it('preserva ellipse con label', () => {
    const ellipse: EllipseShape = {
      ...base, id: 'e1', type: 'ellipse', x: 50, y: 60, radiusX: 40, radiusY: 30,
      label: 'Decisión',
    }
    expect(roundTrip([ellipse])).toEqual([ellipse])
  })

  it('preserva rough y rotation en cualquier shape', () => {
    const rect: RectShape = {
      ...base, id: 'r2', type: 'rect', x: 0, y: 0, width: 10, height: 10,
      rough: true, rotation: 45,
    }
    expect(roundTrip([rect])).toEqual([rect])
  })

  it('preserva connector curvo con label y controlPoint', () => {
    const conn: ConnectorShape = {
      ...base, id: 'c1', type: 'connector',
      start: { shapeId: 'a1', anchor: 'e', x: 10, y: 10 },
      end: { shapeId: null, anchor: null, x: 200, y: 100 },
      curved: true, label: 'flujo', controlPoint: { x: 105, y: 20 },
    }
    expect(roundTrip([conn])).toEqual([conn])
  })

  it('preserva connector recto sin campos opcionales', () => {
    const conn: ConnectorShape = {
      ...base, id: 'c2', type: 'connector',
      start: { shapeId: null, anchor: null, x: 0, y: 0 },
      end: { shapeId: null, anchor: null, x: 50, y: 50 },
    }
    expect(roundTrip([conn])).toEqual([conn])
  })

  it('preserva text, line, arrow y freehand', () => {
    const text: TextShape = {
      ...base, id: 't1', type: 'text', x: 5, y: 5,
      text: 'hola', fontSize: 18, fontFamily: 'system-ui, sans-serif',
      bold: false, italic: true,
    }
    const line: LineShape = { ...base, id: 'l1', type: 'line', points: [0, 0, 10, 10] }
    const arrow: ArrowShape = { ...base, id: 'a1', type: 'arrow', points: [0, 0, 30, 30] }
    const freehand: FreehandShape = {
      ...base, id: 'f1', type: 'freehand',
      points: [[0, 0, 0.5], [5, 5, 0.5], [10, 2, 0.5]],
    }
    expect(roundTrip([text, line, arrow, freehand])).toEqual([text, line, arrow, freehand])
  })

  it('preserva grupos y groupId de sus miembros', () => {
    const r1: RectShape = { ...base, id: 'm1', type: 'rect', x: 0, y: 0, width: 10, height: 10, groupId: 'g1' }
    const r2: RectShape = { ...base, id: 'm2', type: 'rect', x: 20, y: 0, width: 10, height: 10, groupId: 'g1' }
    const group: GroupShape = { ...base, id: 'g1', type: 'group', childIds: ['m1', 'm2'] }
    expect(roundTrip([r1, r2, group])).toEqual([r1, r2, group])
  })
})

describe('sanitización de input inválido', () => {
  it('rechaza input que no es array', () => {
    expect(() => sanitizeShapes({ malicia: true })).toThrow()
  })

  it('ignora shapes con type desconocido sin romper el resto', () => {
    const rect = { ...base, id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10 }
    const result = sanitizeShapes([{ type: 'script' }, rect, null, 'basura'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })

  it('clampea coordenadas no finitas y fuera de rango', () => {
    const result = sanitizeShapes([
      { ...base, id: 'r1', type: 'rect', x: Infinity, y: NaN, width: -5, height: 1e9 },
    ])
    const r = result[0] as RectShape
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
    expect(r.width).toBe(10) // fallback: width inválido
    expect(r.height).toBe(1_000_000) // clamp a MAX_COORD
  })

  it('descarta colores inválidos y label/controlPoint malformados', () => {
    const result = sanitizeShapes([
      {
        ...base, id: 'c1', type: 'connector', strokeColor: 'url(javascript:alert(1))',
        start: { shapeId: null, anchor: null, x: 0, y: 0 },
        end: { shapeId: null, anchor: null, x: 9, y: 9 },
        curved: 'yes', label: 42, controlPoint: { x: 'a', y: 0 },
      },
    ])
    const c = result[0] as ConnectorShape
    expect(c.strokeColor).toBe('#000000')
    expect(c.curved).toBeUndefined()
    expect(c.label).toBeUndefined()
    expect(c.controlPoint).toBeUndefined()
  })

  it('descarta rotation no numérica y normaliza módulo 360', () => {
    const result = sanitizeShapes([
      { ...base, id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10, rotation: 405 },
      { ...base, id: 'r2', type: 'rect', x: 0, y: 0, width: 10, height: 10, rotation: 'abc' },
    ])
    expect((result[0] as RectShape).rotation).toBe(45)
    expect((result[1] as RectShape).rotation).toBeUndefined()
  })

  it('limpia groupIds huérfanos', () => {
    const result = sanitizeShapes([
      { ...base, id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10, groupId: 'fantasma' },
    ])
    expect((result[0] as RectShape).groupId).toBeUndefined()
  })

  it('regenera ids duplicados conservando el primero', () => {
    const result = sanitizeShapes([
      { ...base, id: 'dup', type: 'rect', x: 0, y: 0, width: 10, height: 10 },
      { ...base, id: 'dup', type: 'rect', x: 50, y: 0, width: 10, height: 10 },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('dup')
    expect(result[1].id).not.toBe('dup')
    expect(result[1].id.length).toBeGreaterThan(0)
  })

  it('reconstruye childIds desde los miembros reales (groupId es la fuente de verdad)', () => {
    const result = sanitizeShapes([
      { ...base, id: 'm1', type: 'rect', x: 0, y: 0, width: 10, height: 10, groupId: 'g1' },
      { ...base, id: 'm2', type: 'rect', x: 20, y: 0, width: 10, height: 10, groupId: 'g1' },
      // childIds fantasma: no existe ningún shape 'zzz' ni 'qqq'
      { ...base, id: 'g1', type: 'group', childIds: ['zzz', 'qqq'] },
    ])
    const group = result.find((s): s is GroupShape => s.type === 'group')
    expect(group!.childIds).toEqual(['m1', 'm2'])
  })

  it('descarta grupos sin al menos 2 miembros reales y limpia sus groupIds', () => {
    const result = sanitizeShapes([
      // grupo con childIds "válidos" pero ningún shape lo referencia
      { ...base, id: 'g1', type: 'group', childIds: ['a', 'b'] },
      // grupo con un solo miembro real
      { ...base, id: 'g2', type: 'group', childIds: ['m1'] },
      { ...base, id: 'm1', type: 'rect', x: 0, y: 0, width: 10, height: 10, groupId: 'g2' },
    ])
    expect(result.filter(s => s.type === 'group')).toHaveLength(0)
    expect(result.find(s => s.id === 'm1')!.groupId).toBeUndefined()
  })

  it('trunca labels excesivamente largos', () => {
    const result = sanitizeShapes([
      { ...base, id: 'r1', type: 'rect', x: 0, y: 0, width: 10, height: 10, label: 'x'.repeat(50_000) },
    ])
    expect((result[0] as RectShape).label!.length).toBe(1_000)
  })
})
