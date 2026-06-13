import type { Shape, StrokeWidth, StrokeDash, AnchorSide, Lang, GroupShape } from './types'
import { T } from './i18n'
import { nanoid } from './utils'

const VALID_TYPES = ['rect', 'ellipse', 'line', 'arrow', 'freehand', 'text', 'connector', 'group'] as const
const VALID_WIDTHS: StrokeWidth[] = [1, 2, 4, 8]
const VALID_DASHES: StrokeDash[] = ['solid', 'dotted', 'dashed', 'longdash']
const VALID_ANCHORS: AnchorSide[] = ['n', 's', 'e', 'w', 'center']

const MAX_SHAPES = 2000
const MAX_COORD = 1_000_000
const MAX_POINTS = 10_000

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v)
}

function clampCoord(v: unknown): number {
  if (!isFiniteNum(v)) return 0
  return Math.max(-MAX_COORD, Math.min(MAX_COORD, v))
}

function clampPositive(v: unknown, fallback: number): number {
  if (!isFiniteNum(v) || (v as number) <= 0) return fallback
  return Math.min(v as number, MAX_COORD)
}

function sanitizeColor(v: unknown): string {
  if (typeof v !== 'string') return '#000000'
  const s = v.trim().slice(0, 50)
  if (s === 'transparent') return s
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*[\d.]{1,5})?\s*\)$/.test(s)) return s
  return '#000000'
}

function sanitizeId(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

function sanitizeString(v: unknown, maxLen: number): string {
  if (typeof v !== 'string') return ''
  return v.slice(0, maxLen)
}

function sanitizeStrokeWidth(v: unknown): StrokeWidth {
  return VALID_WIDTHS.includes(v as StrokeWidth) ? (v as StrokeWidth) : 2
}

function sanitizeStrokeDash(v: unknown): StrokeDash {
  return VALID_DASHES.includes(v as StrokeDash) ? (v as StrokeDash) : 'solid'
}

function sanitizeOpacity(v: unknown): number {
  if (!isFiniteNum(v)) return 1
  return Math.max(0, Math.min(1, v))
}

function sanitizeBase(r: Record<string, unknown>) {
  return {
    id: sanitizeId(r.id) || nanoid(),
    strokeColor: sanitizeColor(r.strokeColor),
    fillColor: sanitizeColor(r.fillColor),
    strokeWidth: sanitizeStrokeWidth(r.strokeWidth),
    strokeDash: sanitizeStrokeDash(r.strokeDash),
    opacity: sanitizeOpacity(r.opacity),
    ...(r.rough === true ? { rough: true } : {}),
    ...(isFiniteNum(r.rotation) && r.rotation !== 0 ? { rotation: r.rotation % 360 } : {}),
    ...(r.groupId ? { groupId: sanitizeId(r.groupId as string) } : {}),
  }
}

// Campos de etiqueta compartidos por rect y ellipse
function sanitizeLabelProps(r: Record<string, unknown>) {
  if (typeof r.label !== 'string' || !r.label) return {}
  return {
    label: sanitizeString(r.label, 1_000),
    ...(isFiniteNum(r.labelFontSize) && r.labelFontSize > 0
      ? { labelFontSize: Math.min(r.labelFontSize, 512) }
      : {}),
    ...(typeof r.labelFontFamily === 'string'
      ? { labelFontFamily: sanitizeString(r.labelFontFamily, 200) }
      : {}),
    ...(r.labelBold === true ? { labelBold: true } : {}),
    ...(r.labelItalic === true ? { labelItalic: true } : {}),
  }
}

function sanitizeControlPoint(v: unknown) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const p = v as Record<string, unknown>
  if (!isFiniteNum(p.x) || !isFiniteNum(p.y)) return {}
  return { controlPoint: { x: clampCoord(p.x), y: clampCoord(p.y) } }
}

function sanitizeFlatPoints(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v.slice(0, MAX_POINTS).map(clampCoord)
}

function sanitizeAnchor(v: unknown) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return { shapeId: null, anchor: null, x: 0, y: 0 }
  }
  const a = v as Record<string, unknown>
  return {
    shapeId: typeof a.shapeId === 'string' ? sanitizeId(a.shapeId) || null : null,
    anchor: VALID_ANCHORS.includes(a.anchor as AnchorSide) ? (a.anchor as AnchorSide) : null,
    x: clampCoord(a.x),
    y: clampCoord(a.y),
  }
}

export function sanitizeShapes(raw: unknown, lang: Lang = 'es'): Shape[] {
  const ts = T[lang].sanitize
  if (!Array.isArray(raw)) throw new Error(ts.notArray)
  if (raw.length > MAX_SHAPES) throw new Error(ts.tooMany(MAX_SHAPES))

  const result: Shape[] = []
  const seenIds = new Set<string>()

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const r = item as Record<string, unknown>
    if (!VALID_TYPES.includes(r.type as typeof VALID_TYPES[number])) continue

    try {
      const base = sanitizeBase(r)
      // ids duplicados (JSON editado a mano o exports concatenados): el
      // primero conserva el id, los repetidos reciben uno nuevo — las
      // referencias (groupId, anchors) siguen apuntando al primero
      if (seenIds.has(base.id)) base.id = nanoid()
      seenIds.add(base.id)

      if (r.type === 'rect') {
        result.push({
          ...base, type: 'rect',
          x: clampCoord(r.x), y: clampCoord(r.y),
          width: clampPositive(r.width, 10),
          height: clampPositive(r.height, 10),
          ...sanitizeLabelProps(r),
        })
      } else if (r.type === 'ellipse') {
        result.push({
          ...base, type: 'ellipse',
          x: clampCoord(r.x), y: clampCoord(r.y),
          radiusX: clampPositive(r.radiusX, 10),
          radiusY: clampPositive(r.radiusY, 10),
          ...sanitizeLabelProps(r),
        })
      } else if (r.type === 'line') {
        result.push({ ...base, type: 'line', points: sanitizeFlatPoints(r.points) })
      } else if (r.type === 'arrow') {
        result.push({ ...base, type: 'arrow', points: sanitizeFlatPoints(r.points) })
      } else if (r.type === 'freehand') {
        const pts = Array.isArray(r.points)
          ? r.points.slice(0, MAX_POINTS).map(p =>
              Array.isArray(p) ? p.slice(0, 3).map(clampCoord) : []
            ).filter(p => p.length > 0)
          : []
        result.push({ ...base, type: 'freehand', points: pts })
      } else if (r.type === 'text') {
        result.push({
          ...base, type: 'text',
          x: clampCoord(r.x), y: clampCoord(r.y),
          text: sanitizeString(r.text, 10_000),
          fontSize: clampPositive(r.fontSize, 18),
          fontFamily: sanitizeString(r.fontFamily, 200),
          bold: r.bold === true,
          italic: r.italic === true,
        })
      } else if (r.type === 'connector') {
        result.push({
          ...base, type: 'connector',
          start: sanitizeAnchor(r.start),
          end: sanitizeAnchor(r.end),
          ...(r.curved === true ? { curved: true } : {}),
          ...(typeof r.label === 'string' && r.label ? { label: sanitizeString(r.label, 500) } : {}),
          ...sanitizeControlPoint(r.controlPoint),
        })
      } else if (r.type === 'group') {
        // childIds se reconstruye al final desde los miembros reales
        result.push({ ...base, type: 'group', childIds: [] } as GroupShape)
      }
    } catch {
      // shape malformado — se ignora, no rompe el resto
    }
  }

  // Consistencia de grupos: la fuente de verdad es el groupId de los
  // miembros. childIds se deriva de ahí; un grupo con menos de 2 miembros
  // reales se descarta y sus groupIds quedan limpios.
  const groupIds = new Set(result.filter(s => s.type === 'group').map(s => s.id))
  const membersByGroup = new Map<string, string[]>()
  for (const s of result) {
    if (s.type === 'group' || !s.groupId) continue
    if (!groupIds.has(s.groupId)) continue
    const members = membersByGroup.get(s.groupId) ?? []
    members.push(s.id)
    membersByGroup.set(s.groupId, members)
  }
  const validGroups = new Set(
    [...membersByGroup.entries()].filter(([, m]) => m.length >= 2).map(([gid]) => gid)
  )
  return result
    .filter(s => s.type !== 'group' || validGroups.has(s.id))
    .map(s => {
      if (s.type === 'group') return { ...s, childIds: membersByGroup.get(s.id)! }
      if (s.groupId && !validGroups.has(s.groupId)) return { ...s, groupId: undefined } as Shape
      return s
    })
}
