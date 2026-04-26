import { useRef, useEffect, useState, useCallback } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Ellipse, Line, Arrow, Shape as KonvaShape, Text, Transformer, Circle, Group } from 'react-konva'
import { getStroke } from 'perfect-freehand'
import { useStore } from './store'
import { nanoid } from './utils'
import type { Shape, Point, FreehandShape, ConnectorShape, AnchorSide, StrokeDash, RectShape, EllipseShape } from './types'

const DASH_MAP: Record<StrokeDash, number[]> = {
  solid:    [],
  dotted:   [2, 5],
  dashed:   [10, 6],
  longdash: [20, 8],
}
import { getAnchorPos, getShapeAnchors, findNearestAnchor, findHoveredConnectable } from './anchors'
import rough from 'roughjs'
import type { Drawable } from 'roughjs/bin/core'

function hashSeed(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0
  return Math.abs(h)
}

function drawRoughOps(raw: CanvasRenderingContext2D, drawable: Drawable, stroke: string, fill: string, strokeWidth: number) {
  for (const set of drawable.sets) {
    raw.save()
    if (set.type === 'path') {
      raw.strokeStyle = stroke
      raw.lineWidth = strokeWidth
      raw.beginPath()
      for (const op of set.ops) {
        const d = op.data
        if (op.op === 'move') raw.moveTo(d[0], d[1])
        else if (op.op === 'lineTo') raw.lineTo(d[0], d[1])
        else if (op.op === 'bcurveTo') raw.bezierCurveTo(d[0], d[1], d[2], d[3], d[4], d[5])
      }
      raw.stroke()
    } else if (set.type === 'fillPath') {
      if (fill !== 'transparent') {
        raw.fillStyle = fill
        raw.beginPath()
        for (const op of set.ops) {
          const d = op.data
          if (op.op === 'move') raw.moveTo(d[0], d[1])
          else if (op.op === 'lineTo') raw.lineTo(d[0], d[1])
          else if (op.op === 'bcurveTo') raw.bezierCurveTo(d[0], d[1], d[2], d[3], d[4], d[5])
        }
        raw.fill()
      }
    } else if (set.type === 'fillSketch') {
      if (fill !== 'transparent') {
        raw.strokeStyle = fill
        raw.lineWidth = 1
        raw.beginPath()
        for (const op of set.ops) {
          const d = op.data
          if (op.op === 'move') raw.moveTo(d[0], d[1])
          else if (op.op === 'lineTo') raw.lineTo(d[0], d[1])
          else if (op.op === 'bcurveTo') raw.bezierCurveTo(d[0], d[1], d[2], d[3], d[4], d[5])
        }
        raw.stroke()
      }
    }
    raw.restore()
  }
}

// Helper: get bounding box of a shape in world coordinates
function getShapeBounds(shape: Shape): { x: number; y: number; w: number; h: number } | null {
  if (shape.type === 'rect') return { x: shape.x, y: shape.y, w: Math.abs(shape.width), h: Math.abs(shape.height) }
  if (shape.type === 'ellipse') return { x: shape.x - shape.radiusX, y: shape.y - shape.radiusY, w: shape.radiusX * 2, h: shape.radiusY * 2 }
  if (shape.type === 'line' || shape.type === 'arrow') {
    const [x1, y1, x2, y2] = shape.points
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
  }
  if (shape.type === 'text') return { x: shape.x, y: shape.y, w: 200, h: shape.fontSize * 1.5 }
  if (shape.type === 'freehand') {
    const xs = shape.points.map(p => p[0])
    const ys = shape.points.map(p => p[1])
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  }
  return null
}

// Helper: check if two rects intersect (handles negative w/h from rubber band)
function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  const ax1 = Math.min(a.x, a.x + a.w), ax2 = Math.max(a.x, a.x + a.w)
  const ay1 = Math.min(a.y, a.y + a.h), ay2 = Math.max(a.y, a.y + a.h)
  const bx1 = Math.min(b.x, b.x + b.w), bx2 = Math.max(b.x, b.x + b.w)
  const by1 = Math.min(b.y, b.y + b.h), by2 = Math.max(b.y, b.y + b.h)
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
}

function GridLayer({ stageScale, stagePos }: { stageScale: number; stagePos: Point }) {
  let pitch = 20
  while (pitch * stageScale < 16) pitch *= 2

  const W = window.innerWidth
  const H = window.innerHeight
  const wLeft  = -stagePos.x / stageScale
  const wTop   = -stagePos.y / stageScale
  const wRight  = (W - stagePos.x) / stageScale
  const wBottom = (H - stagePos.y) / stageScale

  const startX = Math.floor(wLeft  / pitch) * pitch
  const startY = Math.floor(wTop   / pitch) * pitch
  const lw = 1 / stageScale

  return (
    <Layer listening={false} name="grid">
      <KonvaShape
        listening={false}
        fill="transparent"
        stroke="transparent"
        sceneFunc={(ctx) => {
          const raw = (ctx as any)._context as CanvasRenderingContext2D
          raw.save()
          raw.strokeStyle = '#2a2d3a'
          raw.lineWidth = lw
          raw.beginPath()
          for (let x = startX; x <= wRight + pitch; x += pitch) {
            raw.moveTo(x, wTop - pitch)
            raw.lineTo(x, wBottom + pitch)
          }
          for (let y = startY; y <= wBottom + pitch; y += pitch) {
            raw.moveTo(wLeft - pitch, y)
            raw.lineTo(wRight + pitch, y)
          }
          raw.stroke()
          raw.restore()
        }}
      />
    </Layer>
  )
}

function ConnectorNode({ shape, shapes, isSelected, onSelect, onRegister, onDblClick }: {
  shape: ConnectorShape
  shapes: Shape[]
  isSelected: boolean
  onSelect: () => void
  onRegister: (id: string, node: Konva.Node | null) => void
  onDblClick?: () => void
}) {
  const nodeRef = useRef<Konva.Node>(null)
  const updateShape = useStore(s => s.updateShape)

  useEffect(() => {
    onRegister(shape.id, nodeRef.current)
    return () => onRegister(shape.id, null)
  }, [shape.id, onRegister])

  const startShape = shape.start.shapeId ? shapes.find(s => s.id === shape.start.shapeId) : null
  const endShape = shape.end.shapeId ? shapes.find(s => s.id === shape.end.shapeId) : null

  const sp = startShape && shape.start.anchor
    ? getAnchorPos(startShape, shape.start.anchor)
    : { x: shape.start.x, y: shape.start.y }
  const ep = endShape && shape.end.anchor
    ? getAnchorPos(endShape, shape.end.anchor)
    : { x: shape.end.x, y: shape.end.y }

  const dashArray = DASH_MAP[shape.strokeDash] ?? []

  if (shape.curved) {
    const mx = (sp.x + ep.x) / 2
    const my = (sp.y + ep.y) / 2
    const dx = ep.x - sp.x
    const dy = ep.y - sp.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const curveOff = Math.min(len / 3, 80)
    const cp = shape.controlPoint ?? { x: mx + nx * curveOff, y: my + ny * curveOff }

    // Bezier midpoint at t=0.5
    const labelX = 0.25 * sp.x + 0.5 * cp.x + 0.25 * ep.x
    const labelY = 0.25 * sp.y + 0.5 * cp.y + 0.25 * ep.y

    // Arrowhead angle: tangent at t=1 points from cp to ep
    const arrowAngle = Math.atan2(ep.y - cp.y, ep.x - cp.x)
    const al = 10, aw = 7

    // Bounding box del bezier = convex hull de sp, cp, ep
    const PAD = 6
    const bboxX = Math.min(sp.x, ep.x, cp.x) - PAD
    const bboxY = Math.min(sp.y, ep.y, cp.y) - PAD
    const bboxW = Math.max(sp.x, ep.x, cp.x) - bboxX - PAD + PAD * 2
    const bboxH = Math.max(sp.y, ep.y, cp.y) - bboxY - PAD + PAD * 2

    return (
      <>
        {/* Bounding box punteado */}
        {isSelected && (
          <Rect
            x={bboxX} y={bboxY} width={bboxW} height={bboxH}
            stroke="#3b82f6" strokeWidth={1}
            dash={[4, 4]} fill="transparent" opacity={0.3} listening={false}
          />
        )}
        {/* Halo de selección para conector curvo */}
        {isSelected && (
          <KonvaShape
            sceneFunc={(ctx) => {
              const raw = (ctx as any)._context as CanvasRenderingContext2D
              raw.save()
              raw.beginPath()
              raw.moveTo(sp.x, sp.y)
              raw.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y)
              raw.strokeStyle = '#3b82f6'
              raw.lineWidth = shape.strokeWidth + 6
              raw.globalAlpha = 0.25
              raw.setLineDash([])
              raw.stroke()
              raw.restore()
            }}
            fill="transparent" stroke="transparent" strokeWidth={0} listening={false}
          />
        )}
        <KonvaShape
          ref={nodeRef as React.RefObject<Konva.Shape>}
          sceneFunc={(ctx, sh) => {
            // Bezier path via Konva ctx — on the hit canvas esto usa el color único
            // de la shape, lo que permite que el click detection funcione correctamente
            const raw = (ctx as any)._context as CanvasRenderingContext2D
            raw.beginPath()
            raw.moveTo(sp.x, sp.y)
            raw.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y)
            ctx.strokeShape(sh)  // aplica stroke/hit-color correctamente
            // Punta de flecha: solo visual, con raw canvas
            raw.save()
            raw.globalAlpha = shape.opacity
            raw.fillStyle = shape.strokeColor
            raw.setLineDash([])
            raw.beginPath()
            raw.moveTo(ep.x, ep.y)
            raw.lineTo(ep.x - al * Math.cos(arrowAngle - aw / al), ep.y - al * Math.sin(arrowAngle - aw / al))
            raw.lineTo(ep.x - al * Math.cos(arrowAngle + aw / al), ep.y - al * Math.sin(arrowAngle + aw / al))
            raw.closePath()
            raw.fill()
            raw.restore()
          }}
          stroke={shape.strokeColor}
          strokeWidth={shape.strokeWidth}
          dash={dashArray.length ? dashArray : undefined}
          fill="transparent"
          opacity={shape.opacity}
          hitStrokeWidth={16}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={onDblClick}
        />
        {shape.label && (
          <Text
            x={labelX - 60} y={labelY - 11}
            width={120}
            text={shape.label}
            fontSize={12}
            fontFamily="system-ui, sans-serif"
            fill={shape.strokeColor}
            align="center"
            listening={false}
          />
        )}
        {isSelected && (
          <Circle
            x={cp.x} y={cp.y}
            radius={6}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={2}
            draggable
            onDragEnd={(e) => {
              updateShape(shape.id, { controlPoint: { x: e.target.x(), y: e.target.y() } } as Partial<Shape>)
            }}
          />
        )}
        {/* Endpoints — más grandes y marcados cuando está seleccionado */}
        <Circle x={sp.x} y={sp.y} radius={isSelected ? 5 : 4}
          fill={isSelected ? '#ffffff' : shape.strokeColor}
          stroke={isSelected ? '#3b82f6' : undefined}
          strokeWidth={isSelected ? 2 : 0}
          listening={false} />
        <Circle x={ep.x} y={ep.y} radius={isSelected ? 5 : 4}
          fill={isSelected ? '#ffffff' : shape.strokeColor}
          stroke={isSelected ? '#3b82f6' : undefined}
          strokeWidth={isSelected ? 2 : 0}
          listening={false} />
      </>
    )
  }

  // Straight connector
  const midX = (sp.x + ep.x) / 2
  const midY = (sp.y + ep.y) / 2
  const PAD2 = 6
  const sbboxX = Math.min(sp.x, ep.x) - PAD2
  const sbboxY = Math.min(sp.y, ep.y) - PAD2
  const sbboxW = Math.abs(ep.x - sp.x) + PAD2 * 2
  const sbboxH = Math.abs(ep.y - sp.y) + PAD2 * 2

  return (
    <>
      {/* Bounding box punteado */}
      {isSelected && (
        <Rect
          x={sbboxX} y={sbboxY} width={sbboxW} height={sbboxH}
          stroke="#3b82f6" strokeWidth={1}
          dash={[4, 4]} fill="transparent" opacity={0.3} listening={false}
        />
      )}
      {/* Halo de selección — línea más ancha y semitransparente detrás */}
      {isSelected && (
        <Arrow
          points={[sp.x, sp.y, ep.x, ep.y]}
          stroke="#3b82f6"
          strokeWidth={shape.strokeWidth + 6}
          fill="transparent"
          pointerLength={0}
          pointerWidth={0}
          opacity={0.25}
          listening={false}
        />
      )}
      <Arrow
        ref={nodeRef as React.RefObject<Konva.Arrow>}
        points={[sp.x, sp.y, ep.x, ep.y]}
        stroke={shape.strokeColor}
        strokeWidth={shape.strokeWidth}
        dash={dashArray.length ? dashArray : undefined}
        fill={shape.strokeColor}
        pointerLength={10}
        pointerWidth={8}
        opacity={shape.opacity}
        hitStrokeWidth={12}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDblClick}
      />
      {shape.label && (
        <Text
          x={midX - 60} y={midY - 11}
          width={120}
          text={shape.label}
          fontSize={12}
          fontFamily="system-ui, sans-serif"
          fill={shape.strokeColor}
          align="center"
          listening={false}
        />
      )}
      {/* Endpoints */}
      <Circle x={sp.x} y={sp.y} radius={isSelected ? 5 : 4}
        fill={isSelected ? '#ffffff' : shape.strokeColor}
        stroke={isSelected ? '#3b82f6' : undefined}
        strokeWidth={isSelected ? 2 : 0}
        listening={false} />
      <Circle x={ep.x} y={ep.y} radius={isSelected ? 5 : 4}
        fill={isSelected ? '#ffffff' : shape.strokeColor}
        stroke={isSelected ? '#3b82f6' : undefined}
        strokeWidth={isSelected ? 2 : 0}
        listening={false} />
    </>
  )
}

function ShapeNode({ shape, isSelected: _isSelected, onSelect, onChange, onRegister, onDblClick }: {
  shape: Shape
  isSelected: boolean
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onChange: (patch: Partial<Shape>) => void
  onRegister: (id: string, node: Konva.Node | null) => void
  onDblClick?: () => void
}) {
  const shapeRef = useRef<Konva.Node>(null)
  const tool = useStore(s => s.tool)

  useEffect(() => {
    onRegister(shape.id, shapeRef.current)
    return () => onRegister(shape.id, null)
  }, [shape.id, onRegister])

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    const { gridEnabled, stageScale: sc, stagePos: sp } = useStore.getState()
    if (!gridEnabled) return pos
    let pitch = 20
    while (pitch * sc < 16) pitch *= 2
    const ps = pitch * sc
    return {
      x: Math.round((pos.x - sp.x) / ps) * ps + sp.x,
      y: Math.round((pos.y - sp.y) / ps) * ps + sp.y,
    }
  }

  const dashArray = DASH_MAP[shape.strokeDash] ?? []
  const common = {
    stroke: shape.strokeColor,
    strokeWidth: shape.strokeWidth,
    dash: dashArray.length ? dashArray : undefined,
    opacity: shape.opacity,
    draggable: tool === 'select',
    dragBoundFunc,
    onClick: onSelect,
    onTap: () => onSelect({} as Konva.KonvaEventObject<MouseEvent>),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ x: e.target.x(), y: e.target.y() } as Partial<Shape>)
    },
  }

  let node: React.ReactNode = null

  if (shape.type === 'rect') {
    const lw = Math.abs(shape.width)
    const lh = Math.abs(shape.height)
    const lx = shape.width < 0 ? shape.width : 0
    const ly = shape.height < 0 ? shape.height : 0
    node = (
      <Group
        ref={shapeRef as React.RefObject<Konva.Group>}
        x={shape.x} y={shape.y}
        draggable={tool === 'select'} opacity={shape.opacity}
        dragBoundFunc={dragBoundFunc}
        onClick={onSelect}
        onTap={() => onSelect({} as Konva.KonvaEventObject<MouseEvent>)}
        onDblClick={onDblClick}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => onChange({ x: e.target.x(), y: e.target.y() } as Partial<Shape>)}
        rotation={shape.rotation ?? 0}
        onTransformEnd={() => {
          const g = shapeRef.current as Konva.Group
          onChange({ x: g.x(), y: g.y(), rotation: g.rotation(), width: Math.max(1, shape.width * g.scaleX()), height: Math.max(1, shape.height * g.scaleY()) } as Partial<Shape>)
          g.scaleX(1); g.scaleY(1)
        }}
      >
        {shape.rough ? (
          <>
            <KonvaShape listening={false} sceneFunc={(ctx, sh) => {
              const raw = (ctx as any)._context as CanvasRenderingContext2D
              const hasFill = shape.fillColor !== 'transparent'
              const d = rough.generator().rectangle(lx, ly, lw, lh, {
                seed: hashSeed(shape.id), roughness: 1.5, strokeWidth: shape.strokeWidth,
                fill: hasFill ? shape.fillColor : undefined, fillStyle: 'hachure',
              })
              drawRoughOps(raw, d, shape.strokeColor, shape.fillColor, shape.strokeWidth)
              ctx.fillStrokeShape(sh)
            }} fill="transparent" stroke="transparent" strokeWidth={0} />
            <Rect x={lx} y={ly} width={lw} height={lh} fill="transparent" stroke="transparent" strokeWidth={0} />
          </>
        ) : (
          <Rect x={0} y={0} width={shape.width} height={shape.height} fill={shape.fillColor} stroke={shape.strokeColor} strokeWidth={shape.strokeWidth} dash={dashArray.length ? dashArray : undefined} />
        )}
        {shape.label && (
          <Text x={lx} y={ly} width={lw} height={lh} text={shape.label} fontSize={shape.labelFontSize ?? 16} fontFamily={shape.labelFontFamily ?? 'system-ui, sans-serif'} fontStyle={[shape.labelItalic ? 'italic' : '', shape.labelBold ? 'bold' : ''].filter(Boolean).join(' ') || 'normal'} fill={shape.strokeColor} align="center" verticalAlign="middle" wrap="word" padding={6} listening={false} />
        )}
      </Group>
    )
  } else if (shape.type === 'ellipse') {
    node = (
      <Group
        ref={shapeRef as React.RefObject<Konva.Group>}
        x={shape.x} y={shape.y}
        draggable={tool === 'select'} opacity={shape.opacity}
        dragBoundFunc={dragBoundFunc}
        onClick={onSelect}
        onTap={() => onSelect({} as Konva.KonvaEventObject<MouseEvent>)}
        onDblClick={onDblClick}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => onChange({ x: e.target.x(), y: e.target.y() } as Partial<Shape>)}
        rotation={shape.rotation ?? 0}
        onTransformEnd={() => {
          const g = shapeRef.current as Konva.Group
          onChange({ x: g.x(), y: g.y(), rotation: g.rotation(), radiusX: Math.max(1, shape.radiusX * g.scaleX()), radiusY: Math.max(1, shape.radiusY * g.scaleY()) } as Partial<Shape>)
          g.scaleX(1); g.scaleY(1)
        }}
      >
        {shape.rough ? (
          <>
            <KonvaShape listening={false} sceneFunc={(ctx, sh) => {
              const raw = (ctx as any)._context as CanvasRenderingContext2D
              const hasFill = shape.fillColor !== 'transparent'
              const d = rough.generator().ellipse(0, 0, shape.radiusX * 2, shape.radiusY * 2, {
                seed: hashSeed(shape.id), roughness: 1.5, strokeWidth: shape.strokeWidth,
                fill: hasFill ? shape.fillColor : undefined, fillStyle: 'hachure',
              })
              drawRoughOps(raw, d, shape.strokeColor, shape.fillColor, shape.strokeWidth)
              ctx.fillStrokeShape(sh)
            }} fill="transparent" stroke="transparent" strokeWidth={0} />
            <Ellipse x={0} y={0} radiusX={shape.radiusX} radiusY={shape.radiusY} fill="transparent" stroke="transparent" strokeWidth={0} />
          </>
        ) : (
          <Ellipse x={0} y={0} radiusX={shape.radiusX} radiusY={shape.radiusY} fill={shape.fillColor} stroke={shape.strokeColor} strokeWidth={shape.strokeWidth} dash={dashArray.length ? dashArray : undefined} />
        )}
        {shape.label && (
          <Text x={-shape.radiusX} y={-shape.radiusY} width={shape.radiusX * 2} height={shape.radiusY * 2} text={shape.label} fontSize={shape.labelFontSize ?? 16} fontFamily={shape.labelFontFamily ?? 'system-ui, sans-serif'} fontStyle={[shape.labelItalic ? 'italic' : '', shape.labelBold ? 'bold' : ''].filter(Boolean).join(' ') || 'normal'} fill={shape.strokeColor} align="center" verticalAlign="middle" wrap="word" padding={6} listening={false} />
        )}
      </Group>
    )
  } else if (shape.type === 'line') {
    node = shape.rough ? (
      <KonvaShape
        ref={shapeRef as React.RefObject<Konva.Shape>}
        {...common}
        hitStrokeWidth={12}
        sceneFunc={(ctx, sh) => {
          const raw = (ctx as any)._context as CanvasRenderingContext2D
          const [x1, y1, x2, y2] = shape.points
          const d = rough.generator().line(x1, y1, x2, y2, { seed: hashSeed(shape.id), roughness: 1.5, strokeWidth: shape.strokeWidth })
          drawRoughOps(raw, d, shape.strokeColor, 'transparent', shape.strokeWidth)
          ctx.fillStrokeShape(sh)
        }}
        fill="transparent" stroke="transparent" strokeWidth={0}
      />
    ) : (
      <Line ref={shapeRef as React.RefObject<Konva.Line>} {...common} points={shape.points} fill="transparent" />
    )
  } else if (shape.type === 'arrow') {
    node = shape.rough ? (
      <KonvaShape
        ref={shapeRef as React.RefObject<Konva.Shape>}
        {...common}
        hitStrokeWidth={12}
        sceneFunc={(ctx, sh) => {
          const raw = (ctx as any)._context as CanvasRenderingContext2D
          const [x1, y1, x2, y2] = shape.points
          const d = rough.generator().line(x1, y1, x2, y2, { seed: hashSeed(shape.id), roughness: 1.5, strokeWidth: shape.strokeWidth })
          drawRoughOps(raw, d, shape.strokeColor, 'transparent', shape.strokeWidth)
          // arrowhead
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const al = 12, aw = 8
          raw.save()
          raw.fillStyle = shape.strokeColor
          raw.beginPath()
          raw.moveTo(x2, y2)
          raw.lineTo(x2 - al * Math.cos(angle - aw / al), y2 - al * Math.sin(angle - aw / al))
          raw.lineTo(x2 - al * Math.cos(angle + aw / al), y2 - al * Math.sin(angle + aw / al))
          raw.closePath()
          raw.fill()
          raw.restore()
          ctx.fillStrokeShape(sh)
        }}
        fill="transparent" stroke="transparent" strokeWidth={0}
      />
    ) : (
      <Arrow ref={shapeRef as React.RefObject<Konva.Arrow>} {...common} points={shape.points} fill={shape.strokeColor} pointerLength={10} pointerWidth={8} />
    )
  } else if (shape.type === 'freehand') {
    node = (
      <KonvaShape
        ref={shapeRef as React.RefObject<Konva.Shape>}
        {...common}
        sceneFunc={(ctx, sh) => {
          const stroke = getStroke(shape.points, { size: shape.strokeWidth * 3, thinning: 0.5, smoothing: 0.5, streamline: 0.5 })
          if (!stroke.length) return
          ctx.beginPath()
          ctx.moveTo(stroke[0][0], stroke[0][1])
          for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i][0], stroke[i][1])
          ctx.closePath()
          ctx.fillStrokeShape(sh)
        }}
        hitFunc={(ctx) => {
          if (!shape.points.length) return
          const raw = (ctx as any)._context as CanvasRenderingContext2D
          raw.beginPath()
          raw.moveTo(shape.points[0][0], shape.points[0][1])
          for (let i = 1; i < shape.points.length; i++) raw.lineTo(shape.points[i][0], shape.points[i][1])
          raw.lineWidth = 20
          raw.strokeStyle = '#000'
          raw.stroke()
        }}
        fill={shape.strokeColor}
        stroke="transparent"
        strokeWidth={0}
      />
    )
  } else if (shape.type === 'text') {
    node = (
      <Text
        ref={shapeRef as React.RefObject<Konva.Text>}
        draggable={common.draggable}
        onClick={common.onClick}
        onTap={common.onTap}
        onDragEnd={common.onDragEnd}
        opacity={common.opacity}
        x={shape.x} y={shape.y}
        text={shape.text}
        fontSize={shape.fontSize}
        fontFamily={shape.fontFamily}
        fontStyle={[shape.italic ? 'italic' : '', shape.bold ? 'bold' : ''].filter(Boolean).join(' ') || 'normal'}
        fill={shape.strokeColor}
        stroke="transparent"
        strokeWidth={0}
      />
    )
  }

  if (!node) return null

  return <>{node}</>
}

function LabelEditor({ ed, scale, fontSize, fontFamily, bold, italic, onCommit, onCancel }: {
  ed: { shapeId: string; x: number; y: number; w: number; h: number; color: string; value: string }
  scale: number
  fontSize: number
  fontFamily: string
  bold: boolean
  italic: boolean
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <textarea
      ref={ref}
      className="absolute outline-none resize-none text-center"
      style={{
        left: ed.x, top: ed.y, width: ed.w, height: ed.h,
        fontSize: fontSize * scale,
        fontFamily,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        color: ed.color,
        lineHeight: 1.3,
        padding: Math.round(6 * scale),
        paddingTop: Math.max(0, Math.round((ed.h - fontSize * scale * 1.3) / 2)),
        boxSizing: 'border-box',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
      defaultValue={ed.value}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommit((e.target as HTMLTextAreaElement).value) }
      }}
    />
  )
}

export function Canvas() {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeNodeRefs = useRef<Map<string, Konva.Node>>(new Map())

  const {
    shapes, selectedIds, tool,
    strokeColor, fillColor, strokeWidth, strokeDash, opacity, roughEnabled,
    stageScale, stagePos, gridEnabled,
    textFontSize, textFontFamily, textBold, textItalic,
    setTextFontSize, setTextFontFamily, setTextBold, setTextItalic,
    setSelectedIds, setStageScale, setStagePos, setTool, setIsLabelEditing,
    addShape, updateShape, deleteShape, deleteSelectedShapes,
  } = useStore()

  const [drawing, setDrawing] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; stageX: number; stageY: number } | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const isPanning = useRef(false)
  const lastPointer = useRef<Point>({ x: 0, y: 0 })
  const textInputRef = useRef(textInput)
  useEffect(() => { textInputRef.current = textInput }, [textInput])

  // Bounding box pre-transform para escalar controlPoints de conectores curvos
  const preTrSelBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  // Rubber band selection state
  const selStartPos = useRef<Point | null>(null)
  const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Connector state
  const [nearShapeId, setNearShapeId] = useState<string | null>(null)
  const [snapAnchor, setSnapAnchor] = useState<{ shapeId: string; anchor: AnchorSide; pos: Point } | null>(null)
  type ConnStart = { anchor: { shapeId: string; anchor: AnchorSide }; pos: Point }
  const [connStart, setConnStart] = useState<ConnStart | null>(null)
  const connStartRef = useRef<ConnStart | null>(null)
  const [connDraftEnd, setConnDraftEnd] = useState<Point | null>(null)

  const [labelEditor, setLabelEditor] = useState<{
    shapeId: string; x: number; y: number; w: number; h: number; color: string; value: string
  } | null>(null)
  const labelEditorRef = useRef(labelEditor)
  useEffect(() => { labelEditorRef.current = labelEditor }, [labelEditor])

  const commitLabel = useCallback((value: string) => {
    if (labelEditorRef.current) {
      const shapeId = labelEditorRef.current.shapeId
      const current = useStore.getState().shapes.find(s => s.id === shapeId)
      if (current?.type === 'connector') {
        updateShape(shapeId, { label: value || undefined } as Partial<Shape>)
      } else {
        const { textFontSize: fs, textFontFamily: ff, textBold: b, textItalic: it } = useStore.getState()
        updateShape(shapeId, { label: value || undefined, labelFontSize: fs, labelFontFamily: ff, labelBold: b, labelItalic: it } as Partial<Shape>)
      }
    }
    setLabelEditor(null)
    setIsLabelEditing(false)
  }, [updateShape, setIsLabelEditing])

  // Register/unregister shape nodes for the Transformer
  const registerRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      shapeNodeRefs.current.set(id, node)
    } else {
      shapeNodeRefs.current.delete(id)
    }
  }, [])

  // Sync Transformer nodes when selectedIds changes — excluye conectores
  useEffect(() => {
    const tr = transformerRef.current
    if (!tr) return
    const currentShapes = useStore.getState().shapes
    const nodes = selectedIds
      .filter(id => {
        const s = currentShapes.find(sh => sh.id === id)
        return s && s.type !== 'connector'
      })
      .map(id => shapeNodeRefs.current.get(id))
      .filter((n): n is Konva.Node => Boolean(n))
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds])

  useEffect(() => {
    const container = stageRef.current?.container()
    if (!container) return
    const onFocus = (e: FocusEvent) => (e.target as HTMLElement).blur()
    container.addEventListener('focusin', onFocus)
    return () => container.removeEventListener('focusin', onFocus)
  }, [])

  useEffect(() => {
    if (textInput) {
      setTimeout(() => textRef.current?.focus(), 0)
    }
  }, [textInput])

  const getPointerPos = useCallback((): Point => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    if (!pos) return { x: 0, y: 0 }
    return {
      x: (pos.x - stagePos.x) / stageScale,
      y: (pos.y - stagePos.y) / stageScale,
    }
  }, [stagePos, stageScale])

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stageScale
    const pointer = stage.getPointerPosition()!
    const factor = e.evt.deltaY < 0 ? 1.1 : 0.9
    const newScale = Math.min(Math.max(oldScale * factor, 0.1), 10)
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }
    setStageScale(newScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [stageScale, stagePos, setStageScale, setStagePos])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
      isPanning.current = true
      lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY }
      return
    }
    if (textInputRef.current || labelEditorRef.current) return

    if (tool === 'select') {
      if (e.target === stageRef.current) {
        // Click on empty canvas: deselect and start rubber band
        setSelectedIds([])
        selStartPos.current = getPointerPos()
      }
      return
    }
    if (tool === 'delete') return

    if (tool === 'connector') {
      const pos = getPointerPos()
      const snap = findNearestAnchor(useStore.getState().shapes, pos, 18 / stageScale)
      if (snap) {
        const cs = { anchor: { shapeId: snap.shapeId, anchor: snap.anchor }, pos: snap.pos }
        connStartRef.current = cs
        setConnStart(cs)
        setConnDraftEnd(snap.pos)
      }
      return
    }

    const pos = getPointerPos()
    const id = nanoid()
    const base = { id, strokeColor, fillColor, strokeWidth, strokeDash, opacity, rough: roughEnabled }

    if (tool === 'text') {
      e.evt.preventDefault()
      const stage = stageRef.current!
      const pointer = stage.getPointerPosition()!
      setTextInput({ x: pos.x, y: pos.y, stageX: pointer.x, stageY: pointer.y })
      return
    }

    setDrawing(true)
    setDraftId(id)

    if (tool === 'rect') {
      addShape({ ...base, type: 'rect', x: pos.x, y: pos.y, width: 1, height: 1 })
    } else if (tool === 'ellipse') {
      addShape({ ...base, type: 'ellipse', x: pos.x, y: pos.y, radiusX: 1, radiusY: 1 })
    } else if (tool === 'line') {
      addShape({ ...base, type: 'line', points: [pos.x, pos.y, pos.x, pos.y] })
    } else if (tool === 'arrow') {
      addShape({ ...base, type: 'arrow', points: [pos.x, pos.y, pos.x, pos.y] })
    } else if (tool === 'freehand') {
      addShape({ ...base, type: 'freehand', points: [[pos.x, pos.y, 0.5]] } as FreehandShape)
    }
  }, [tool, strokeColor, fillColor, strokeWidth, strokeDash, opacity, stageScale, getPointerPos, addShape, setSelectedIds, setConnStart, setConnDraftEnd])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) {
      const dx = e.evt.clientX - lastPointer.current.x
      const dy = e.evt.clientY - lastPointer.current.y
      lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY }
      setStagePos({ x: stagePos.x + dx, y: stagePos.y + dy })
      return
    }

    if (tool === 'connector') {
      const pos = getPointerPos()
      const threshold = 40 / stageScale
      const snapThreshold = 18 / stageScale
      const currentShapes = useStore.getState().shapes
      setNearShapeId(findHoveredConnectable(currentShapes, pos, threshold))
      const snap = findNearestAnchor(currentShapes, pos, snapThreshold)
      setSnapAnchor(snap)
      if (connStart) setConnDraftEnd(snap ? snap.pos : pos)
      return
    }

    // Rubber band selection
    if (tool === 'select' && selStartPos.current && !drawing) {
      const pos = getPointerPos()
      setSelBox({
        x: selStartPos.current.x,
        y: selStartPos.current.y,
        w: pos.x - selStartPos.current.x,
        h: pos.y - selStartPos.current.y,
      })
      return
    }

    if (!drawing || !draftId) return
    const pos = getPointerPos()
    const shape = useStore.getState().shapes.find(s => s.id === draftId)
    if (!shape) return

    if (shape.type === 'rect') {
      const orig = useStore.getState().shapes.find(s => s.id === draftId) as typeof shape
      updateShape(draftId, {
        width: pos.x - orig.x,
        height: pos.y - orig.y,
      } as Partial<Shape>)
    } else if (shape.type === 'ellipse') {
      const orig = useStore.getState().shapes.find(s => s.id === draftId) as typeof shape
      updateShape(draftId, {
        radiusX: Math.abs(pos.x - orig.x),
        radiusY: Math.abs(pos.y - orig.y),
      } as Partial<Shape>)
    } else if (shape.type === 'line' || shape.type === 'arrow') {
      const pts = [...(shape as { points: number[] }).points]
      pts[2] = pos.x; pts[3] = pos.y
      updateShape(draftId, { points: pts } as Partial<Shape>)
    } else if (shape.type === 'freehand') {
      const fh = shape as FreehandShape
      updateShape(draftId, { points: [...fh.points, [pos.x, pos.y, 0.5]] } as Partial<Shape>)
    }
  }, [tool, drawing, draftId, getPointerPos, updateShape, stagePos, stageScale, setStagePos, connStart, setNearShapeId, setSnapAnchor, setConnDraftEnd])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false

    // Connector: must run before the `drawing` guard
    const cs = connStartRef.current
    if (cs) {
      const pos = getPointerPos()
      const snap = findNearestAnchor(useStore.getState().shapes, pos, 18 / stageScale)
      const startAnchor = { shapeId: cs.anchor.shapeId, anchor: cs.anchor.anchor, x: cs.pos.x, y: cs.pos.y }
      const endAnchor = snap
        ? { shapeId: snap.shapeId, anchor: snap.anchor, x: snap.pos.x, y: snap.pos.y }
        : { shapeId: null as null, anchor: null as null, x: pos.x, y: pos.y }
      if (!snap || snap.shapeId !== cs.anchor.shapeId) {
        addShape({
          id: nanoid(), type: 'connector',
          start: startAnchor, end: endAnchor,
          strokeColor, fillColor: 'transparent', strokeWidth, strokeDash, opacity,
        })
      }
      connStartRef.current = null
      setConnStart(null)
      setConnDraftEnd(null)
      setTool('select')
      return
    }

    // Rubber band: finalize selection
    if (tool === 'select' && selStartPos.current) {
      const currentSelBox = selBox
      if (currentSelBox && (Math.abs(currentSelBox.w) > 4 || Math.abs(currentSelBox.h) > 4)) {
        const currentShapes = useStore.getState().shapes
        const selected = currentShapes.filter(shape => {
          const bounds = getShapeBounds(shape)
          if (!bounds) return false
          return rectsIntersect(bounds, currentSelBox)
        })
        if (selected.length > 0) {
          setSelectedIds(selected.map(s => s.id))
        }
      }
      selStartPos.current = null
      setSelBox(null)
      return
    }

    if (!drawing) return
    setDrawing(false)
    const shape = useStore.getState().shapes.find(s => s.id === draftId)
    if (shape) {
      const MIN = 20
      if (shape.type === 'rect' && Math.abs(shape.width) < MIN && Math.abs(shape.height) < MIN) {
        deleteShape(draftId!)
      } else if (shape.type === 'ellipse' && shape.radiusX < MIN / 2 && shape.radiusY < MIN / 2) {
        deleteShape(draftId!)
      } else if ((shape.type === 'line' || shape.type === 'arrow') && Math.hypot(shape.points[2] - shape.points[0], shape.points[3] - shape.points[1]) < MIN) {
        deleteShape(draftId!)
      }
    }
    setDraftId(null)
  }, [drawing, draftId, deleteShape, getPointerPos, stageScale, addShape, strokeColor, strokeWidth, setTool, tool, selBox, setSelectedIds])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds } = useStore.getState()
        if (selectedIds.length) {
          e.preventDefault()
          deleteSelectedShapes()
        }
      }
      if (e.key === 'Escape' && connStartRef.current) {
        connStartRef.current = null
        setConnStart(null)
        setConnDraftEnd(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelectedShapes, setConnStart, setConnDraftEnd])

  const commitText = useCallback((value: string, switchToSelect = false) => {
    if (textInput && value.trim()) {
      const id = nanoid()
      addShape({
        id, type: 'text',
        x: textInput.x, y: textInput.y,
        text: value.trim(),
        fontSize: textFontSize,
        fontFamily: textFontFamily,
        bold: textBold,
        italic: textItalic,
        strokeColor, fillColor: 'transparent', strokeWidth, strokeDash, opacity,
      })
    }
    setTextInput(null)
    if (switchToSelect) setTool('select')
  }, [textInput, strokeColor, strokeWidth, strokeDash, opacity, textFontSize, textFontFamily, textBold, textItalic, addShape, setTool])

  const cursorClass = tool === 'select' ? 'cursor-default'
    : tool === 'text' ? 'cursor-text'
    : tool === 'delete' ? 'cursor-pointer'
    : 'cursor-crosshair'

  return (
    <div className={`w-full h-full relative ${cursorClass}`}>
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown as never}
        onTouchMove={handleMouseMove as never}
        onTouchEnd={handleMouseUp}
      >
        {gridEnabled && <GridLayer stageScale={stageScale} stagePos={stagePos} />}
        <Layer>
          {shapes.map((shape) =>
            shape.type === 'connector' ? (
              <ConnectorNode
                key={shape.id}
                shape={shape}
                shapes={shapes}
                isSelected={selectedIds.includes(shape.id)}
                onSelect={() => {
                  if (tool === 'delete') { deleteShape(shape.id); return }
                  if (tool === 'select') setSelectedIds([shape.id])
                }}
                onRegister={registerRef}
                onDblClick={() => {
                  if (tool !== 'select') return
                  const conn = shape as ConnectorShape
                  const startSh = conn.start.shapeId ? shapes.find(s => s.id === conn.start.shapeId) : null
                  const endSh = conn.end.shapeId ? shapes.find(s => s.id === conn.end.shapeId) : null
                  const sp2 = startSh && conn.start.anchor ? getAnchorPos(startSh, conn.start.anchor) : { x: conn.start.x, y: conn.start.y }
                  const ep2 = endSh && conn.end.anchor ? getAnchorPos(endSh, conn.end.anchor) : { x: conn.end.x, y: conn.end.y }
                  const midX2 = (sp2.x + ep2.x) / 2
                  const midY2 = (sp2.y + ep2.y) / 2
                  const screenX = midX2 * stageScale + stagePos.x
                  const screenY = midY2 * stageScale + stagePos.y
                  setIsLabelEditing(true)
                  setLabelEditor({ shapeId: conn.id, x: screenX - 75, y: screenY - 20, w: 150, h: 40, color: conn.strokeColor, value: conn.label ?? '' })
                }}
              />
            ) : (
              <ShapeNode
                key={shape.id}
                shape={shape}
                isSelected={selectedIds.includes(shape.id)}
                onSelect={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  if (tool === 'delete') { deleteShape(shape.id); return }
                  if (tool === 'select') {
                    if (e.evt.shiftKey) {
                      // Toggle shape in selection
                      const current = useStore.getState().selectedIds
                      if (current.includes(shape.id)) {
                        setSelectedIds(current.filter(id => id !== shape.id))
                      } else {
                        setSelectedIds([...current, shape.id])
                      }
                    } else {
                      setSelectedIds([shape.id])
                    }
                  }
                }}
                onChange={(patch) => updateShape(shape.id, patch)}
                onRegister={registerRef}
                onDblClick={() => {
                  if (tool !== 'select') return
                  if (shape.type !== 'rect' && shape.type !== 'ellipse') return
                  const sh = shape as RectShape | EllipseShape
                  let lx: number, ly: number, lw: number, lh: number
                  if (sh.type === 'rect') {
                    const w = sh.width, h = sh.height
                    lx = (w < 0 ? sh.x + w : sh.x) * stageScale + stagePos.x
                    ly = (h < 0 ? sh.y + h : sh.y) * stageScale + stagePos.y
                    lw = Math.abs(w) * stageScale
                    lh = Math.abs(h) * stageScale
                  } else {
                    lx = (sh.x - sh.radiusX) * stageScale + stagePos.x
                    ly = (sh.y - sh.radiusY) * stageScale + stagePos.y
                    lw = sh.radiusX * 2 * stageScale
                    lh = sh.radiusY * 2 * stageScale
                  }
                  setTextFontSize(sh.labelFontSize ?? 16)
                  setTextFontFamily(sh.labelFontFamily ?? 'system-ui, sans-serif')
                  setTextBold(sh.labelBold ?? false)
                  setTextItalic(sh.labelItalic ?? false)
                  setIsLabelEditing(true)
                  setLabelEditor({ shapeId: sh.id, x: lx, y: ly, w: lw, h: lh, color: sh.strokeColor, value: sh.label ?? '' })
                }}
              />
            )
          )}

          {/* Anchor dots al hacer hover en modo conector */}
          {tool === 'connector' && nearShapeId && (() => {
            const hovered = shapes.find(s => s.id === nearShapeId)
            if (!hovered) return null
            return getShapeAnchors(hovered).map(({ anchor, pos }) => {
              const isSnap = snapAnchor?.shapeId === nearShapeId && snapAnchor?.anchor === anchor
              return (
                <Circle
                  key={anchor}
                  x={pos.x} y={pos.y}
                  radius={isSnap ? 7 / stageScale : 4.5 / stageScale}
                  fill={isSnap ? '#3b82f6' : '#ffffff'}
                  stroke={isSnap ? '#1d4ed8' : '#3b82f6'}
                  strokeWidth={2 / stageScale}
                  listening={false}
                />
              )
            })
          })()}

          {/* Linea draft mientras se dibuja un conector */}
          {connStart && connDraftEnd && (
            <Arrow
              points={[connStart.pos.x, connStart.pos.y, connDraftEnd.x, connDraftEnd.y]}
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              fill="#3b82f6"
              pointerLength={10 / stageScale}
              pointerWidth={8 / stageScale}
              dash={[6 / stageScale, 4 / stageScale]}
              listening={false}
              opacity={0.7}
            />
          )}

          {/* Rubber band selection rect */}
          {selBox && (
            <Rect
              x={selBox.x}
              y={selBox.y}
              width={selBox.w}
              height={selBox.h}
              stroke="#3b82f6"
              strokeWidth={1 / stageScale}
              dash={[4 / stageScale, 4 / stageScale]}
              fill="rgba(59,130,246,0.08)"
              listening={false}
            />
          )}

          {/* Global Transformer */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
            onTransformStart={() => {
              const { shapes: s, selectedIds: selIds } = useStore.getState()
              const bounds = selIds
                .map(id => s.find(sh => sh.id === id))
                .filter((sh): sh is Shape => !!sh && sh.type !== 'connector')
                .map(getShapeBounds)
                .filter((b): b is NonNullable<ReturnType<typeof getShapeBounds>> => !!b)
              if (!bounds.length) { preTrSelBounds.current = null; return }
              const minX = Math.min(...bounds.map(b => b.x))
              const minY = Math.min(...bounds.map(b => b.y))
              const maxX = Math.max(...bounds.map(b => b.x + b.w))
              const maxY = Math.max(...bounds.map(b => b.y + b.h))
              preTrSelBounds.current = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
            }}
            onTransformEnd={() => {
              const pre = preTrSelBounds.current
              preTrSelBounds.current = null
              if (!pre || pre.w === 0 || pre.h === 0) return
              // setTimeout garantiza que los handlers individuales de cada shape
              // ya actualizaron el store antes de que leamos los bounds post-transform
              setTimeout(() => {
                const { shapes: s, selectedIds: selIds } = useStore.getState()
                const bounds = selIds
                  .map(id => s.find(sh => sh.id === id))
                  .filter((sh): sh is Shape => !!sh && sh.type !== 'connector')
                  .map(getShapeBounds)
                  .filter((b): b is NonNullable<ReturnType<typeof getShapeBounds>> => !!b)
                if (!bounds.length) return
                const minX = Math.min(...bounds.map(b => b.x))
                const minY = Math.min(...bounds.map(b => b.y))
                const maxX = Math.max(...bounds.map(b => b.x + b.w))
                const maxY = Math.max(...bounds.map(b => b.y + b.h))
                const postW = maxX - minX
                const postH = maxY - minY
                if (postW === 0 || postH === 0) return
                const scX = postW / pre.w
                const scY = postH / pre.h
                selIds.forEach(id => {
                  const sh = s.find(x => x.id === id)
                  if (!sh || sh.type !== 'connector') return
                  const conn = sh as ConnectorShape
                  if (!conn.curved || !conn.controlPoint) return
                  updateShape(id, {
                    controlPoint: {
                      x: (conn.controlPoint.x - pre.x) * scX + minX,
                      y: (conn.controlPoint.y - pre.y) * scY + minY,
                    }
                  } as Partial<Shape>)
                })
              }, 0)
            }}
          />
        </Layer>
      </Stage>

      {labelEditor && (
        <LabelEditor
          key={labelEditor.shapeId}
          ed={labelEditor}
          scale={stageScale}
          fontSize={textFontSize}
          fontFamily={textFontFamily}
          bold={textBold}
          italic={textItalic}
          onCommit={commitLabel}
          onCancel={() => { setLabelEditor(null); setIsLabelEditing(false) }}
        />
      )}

      {textInput && (
        <textarea
          ref={textRef}
          autoFocus
          className="absolute bg-transparent border-none outline-none resize-none"
          style={{
            left: textInput.stageX,
            top: textInput.stageY,
            fontSize: textFontSize,
            fontFamily: textFontFamily,
            fontWeight: textBold ? 'bold' : 'normal',
            fontStyle: textItalic ? 'italic' : 'normal',
            color: strokeColor,
            minWidth: 120,
            minHeight: textFontSize + 8,
            lineHeight: 1.3,
          }}
          onBlur={(e) => commitText(e.target.value, true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setTextInput(null); setTool('select') }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              commitText((e.target as HTMLTextAreaElement).value)
            }
          }}
        />
      )}
    </div>
  )
}
