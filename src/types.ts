export type Tool = 'select' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'freehand' | 'text' | 'connector' | 'delete'

export type AnchorSide = 'n' | 's' | 'e' | 'w' | 'center'

export interface AnchorPoint {
  shapeId: string | null
  anchor: AnchorSide | null
  x: number
  y: number
}

export type StrokeWidth = 1 | 2 | 4 | 8
export type StrokeDash = 'solid' | 'dotted' | 'dashed' | 'longdash'

export interface Point {
  x: number
  y: number
}

interface ShapeBase {
  id: string
  strokeColor: string
  fillColor: string
  strokeWidth: StrokeWidth
  strokeDash: StrokeDash
  opacity: number
  rough?: boolean
  rotation?: number
}

export interface RectShape extends ShapeBase {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  label?: string
  labelFontSize?: number
  labelFontFamily?: string
  labelBold?: boolean
  labelItalic?: boolean
}

export interface EllipseShape extends ShapeBase {
  type: 'ellipse'
  x: number
  y: number
  radiusX: number
  radiusY: number
  label?: string
  labelFontSize?: number
  labelFontFamily?: string
  labelBold?: boolean
  labelItalic?: boolean
}

export interface LineShape extends ShapeBase {
  type: 'line'
  points: number[]
}

export interface ArrowShape extends ShapeBase {
  type: 'arrow'
  points: number[]
}

export interface FreehandShape extends ShapeBase {
  type: 'freehand'
  points: number[][]
}

export interface ConnectorShape extends ShapeBase {
  type: 'connector'
  start: AnchorPoint
  end: AnchorPoint
}

export interface TextShape extends ShapeBase {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  bold: boolean
  italic: boolean
}

export type Shape =
  | RectShape
  | EllipseShape
  | LineShape
  | ArrowShape
  | FreehandShape
  | TextShape
  | ConnectorShape

import type { Lang } from './i18n'
export type { Lang }

export interface CanvasState {
  isLabelEditing: boolean
  roughEnabled: boolean
  lang: Lang
  shapes: Shape[]
  selectedIds: string[]
  tool: Tool
  strokeColor: string
  fillColor: string
  strokeWidth: StrokeWidth
  strokeDash: StrokeDash
  opacity: number
  stageScale: number
  stagePos: Point
  past: Shape[][]
  future: Shape[][]
  textFontSize: number
  textFontFamily: string
  textBold: boolean
  textItalic: boolean
}
