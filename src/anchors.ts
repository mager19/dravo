import type { Shape, AnchorSide, Point } from './types'

export const ANCHOR_SIDES: AnchorSide[] = ['n', 's', 'e', 'w', 'center']

export function getAnchorPos(shape: Shape, anchor: AnchorSide): Point {
  switch (shape.type) {
    case 'rect': {
      const cx = shape.x + shape.width / 2
      const cy = shape.y + shape.height / 2
      if (anchor === 'n') return { x: cx, y: shape.y }
      if (anchor === 's') return { x: cx, y: shape.y + shape.height }
      if (anchor === 'e') return { x: shape.x + shape.width, y: cy }
      if (anchor === 'w') return { x: shape.x, y: cy }
      return { x: cx, y: cy }
    }
    case 'ellipse': {
      if (anchor === 'n') return { x: shape.x, y: shape.y - shape.radiusY }
      if (anchor === 's') return { x: shape.x, y: shape.y + shape.radiusY }
      if (anchor === 'e') return { x: shape.x + shape.radiusX, y: shape.y }
      if (anchor === 'w') return { x: shape.x - shape.radiusX, y: shape.y }
      return { x: shape.x, y: shape.y }
    }
    case 'text': {
      const w = shape.text.length * (shape.fontSize * 0.55)
      const h = shape.fontSize * 1.3
      const cx = shape.x + w / 2
      const cy = shape.y + h / 2
      if (anchor === 'n') return { x: cx, y: shape.y }
      if (anchor === 's') return { x: cx, y: shape.y + h }
      if (anchor === 'e') return { x: shape.x + w, y: cy }
      if (anchor === 'w') return { x: shape.x, y: cy }
      return { x: cx, y: cy }
    }
    default:
      return { x: 0, y: 0 }
  }
}

export function getShapeAnchors(shape: Shape): Array<{ anchor: AnchorSide; pos: Point }> {
  if (!['rect', 'ellipse', 'text'].includes(shape.type)) return []
  return ANCHOR_SIDES.map(anchor => ({ anchor, pos: getAnchorPos(shape, anchor) }))
}

export function isPointNearShape(shape: Shape, point: Point, padding: number): boolean {
  switch (shape.type) {
    case 'rect':
      return point.x >= shape.x - padding && point.x <= shape.x + shape.width + padding
          && point.y >= shape.y - padding && point.y <= shape.y + shape.height + padding
    case 'ellipse': {
      const dx = (point.x - shape.x) / (shape.radiusX + padding)
      const dy = (point.y - shape.y) / (shape.radiusY + padding)
      return dx * dx + dy * dy <= 1
    }
    case 'text': {
      const w = shape.text.length * (shape.fontSize * 0.55) + padding
      const h = shape.fontSize * 1.3 + padding
      return point.x >= shape.x - padding && point.x <= shape.x + w
          && point.y >= shape.y - padding && point.y <= shape.y + h
    }
    default:
      return false
  }
}

export function findNearestAnchor(
  shapes: Shape[],
  point: Point,
  threshold: number
): { shapeId: string; anchor: AnchorSide; pos: Point } | null {
  let best: { shapeId: string; anchor: AnchorSide; pos: Point; dist: number } | null = null
  for (const shape of shapes) {
    for (const { anchor, pos } of getShapeAnchors(shape)) {
      const dist = Math.hypot(pos.x - point.x, pos.y - point.y)
      if (dist < threshold && (!best || dist < best.dist)) {
        best = { shapeId: shape.id, anchor, pos, dist }
      }
    }
  }
  return best ? { shapeId: best.shapeId, anchor: best.anchor, pos: best.pos } : null
}

export function findHoveredConnectable(shapes: Shape[], point: Point, padding: number): string | null {
  for (const shape of [...shapes].reverse()) {
    if (isPointNearShape(shape, point, padding)) return shape.id
  }
  return null
}
