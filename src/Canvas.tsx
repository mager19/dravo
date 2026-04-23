import { useRef, useEffect, useState, useCallback } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Ellipse, Line, Arrow, Shape as KonvaShape, Text, Transformer, Circle } from 'react-konva'
import { getStroke } from 'perfect-freehand'
import { useStore } from './store'
import { nanoid } from './utils'
import type { Shape, Point, FreehandShape, ConnectorShape, AnchorSide, StrokeDash } from './types'

const DASH_MAP: Record<StrokeDash, number[]> = {
  solid:    [],
  dotted:   [2, 5],
  dashed:   [10, 6],
  longdash: [20, 8],
}
import { getAnchorPos, getShapeAnchors, findNearestAnchor, findHoveredConnectable } from './anchors'


function ConnectorNode({ shape, shapes, isSelected, onSelect }: {
  shape: ConnectorShape
  shapes: Shape[]
  isSelected: boolean
  onSelect: () => void
}) {
  const arrowRef = useRef<Konva.Arrow>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && arrowRef.current) {
      trRef.current.nodes([arrowRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const startShape = shape.start.shapeId ? shapes.find(s => s.id === shape.start.shapeId) : null
  const endShape = shape.end.shapeId ? shapes.find(s => s.id === shape.end.shapeId) : null

  const sp = startShape && shape.start.anchor
    ? getAnchorPos(startShape, shape.start.anchor)
    : { x: shape.start.x, y: shape.start.y }
  const ep = endShape && shape.end.anchor
    ? getAnchorPos(endShape, shape.end.anchor)
    : { x: shape.end.x, y: shape.end.y }

  return (
    <>
      <Arrow
        ref={arrowRef}
        points={[sp.x, sp.y, ep.x, ep.y]}
        stroke={shape.strokeColor}
        strokeWidth={shape.strokeWidth}
        dash={DASH_MAP[shape.strokeDash]?.length ? DASH_MAP[shape.strokeDash] : undefined}
        fill={shape.strokeColor}
        pointerLength={10}
        pointerWidth={8}
        opacity={shape.opacity}
        hitStrokeWidth={12}
        onClick={onSelect}
        onTap={onSelect}
      />
      {/* endpoint dots */}
      <Circle x={sp.x} y={sp.y} radius={4} fill={shape.strokeColor} listening={false} />
      <Circle x={ep.x} y={ep.y} radius={4} fill={shape.strokeColor} listening={false} />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          resizeEnabled={false}
          borderStroke="#3b82f6"
          borderDash={[4, 4]}
        />
      )}
    </>
  )
}

function ShapeNode({ shape, isSelected, onSelect, onChange }: {
  shape: Shape
  isSelected: boolean
  onSelect: () => void
  onChange: (patch: Partial<Shape>) => void
}) {
  const shapeRef = useRef<Konva.Node>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const dashArray = DASH_MAP[shape.strokeDash] ?? []
  const common = {
    stroke: shape.strokeColor,
    strokeWidth: shape.strokeWidth,
    dash: dashArray.length ? dashArray : undefined,
    opacity: shape.opacity,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ x: e.target.x(), y: e.target.y() } as Partial<Shape>)
    },
  }

  let node: React.ReactNode = null

  if (shape.type === 'rect') {
    node = (
      <Rect
        ref={shapeRef as React.RefObject<Konva.Rect>}
        {...common}
        x={shape.x} y={shape.y}
        width={shape.width} height={shape.height}
        fill={shape.fillColor}
        onTransformEnd={() => {
          const node = shapeRef.current as Konva.Rect
          onChange({
            x: node.x(), y: node.y(),
            width: Math.max(1, node.width() * node.scaleX()),
            height: Math.max(1, node.height() * node.scaleY()),
          } as Partial<Shape>)
          node.scaleX(1); node.scaleY(1)
        }}
      />
    )
  } else if (shape.type === 'ellipse') {
    node = (
      <Ellipse
        ref={shapeRef as React.RefObject<Konva.Ellipse>}
        {...common}
        x={shape.x} y={shape.y}
        radiusX={shape.radiusX} radiusY={shape.radiusY}
        fill={shape.fillColor}
        onTransformEnd={() => {
          const node = shapeRef.current as Konva.Ellipse
          onChange({
            x: node.x(), y: node.y(),
            radiusX: Math.max(1, node.radiusX() * node.scaleX()),
            radiusY: Math.max(1, node.radiusY() * node.scaleY()),
          } as Partial<Shape>)
          node.scaleX(1); node.scaleY(1)
        }}
      />
    )
  } else if (shape.type === 'line') {
    node = (
      <Line
        ref={shapeRef as React.RefObject<Konva.Line>}
        {...common}
        points={shape.points}
        fill="transparent"
      />
    )
  } else if (shape.type === 'arrow') {
    node = (
      <Arrow
        ref={shapeRef as React.RefObject<Konva.Arrow>}
        {...common}
        points={shape.points}
        fill={shape.strokeColor}
        pointerLength={10}
        pointerWidth={8}
      />
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

  return (
    <>
      {node}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
        />
      )}
    </>
  )
}

export function Canvas() {
  const stageRef = useRef<Konva.Stage>(null)
  const {
    shapes, selectedId, tool,
    strokeColor, fillColor, strokeWidth, strokeDash, opacity,
    stageScale, stagePos,
    textFontSize, textFontFamily, textBold, textItalic,
    setSelectedId, setStageScale, setStagePos, setTool,
    addShape, updateShape, deleteShape,
  } = useStore()

  const [drawing, setDrawing] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; stageX: number; stageY: number } | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const isPanning = useRef(false)
  const lastPointer = useRef<Point>({ x: 0, y: 0 })
  const textInputRef = useRef(textInput)
  useEffect(() => { textInputRef.current = textInput }, [textInput])

  // Connector state
  const [nearShapeId, setNearShapeId] = useState<string | null>(null)
  const [snapAnchor, setSnapAnchor] = useState<{ shapeId: string; anchor: AnchorSide; pos: Point } | null>(null)
  type ConnStart = { anchor: { shapeId: string; anchor: AnchorSide }; pos: Point }
  const [connStart, setConnStart] = useState<ConnStart | null>(null)
  const connStartRef = useRef<ConnStart | null>(null)
  const [connDraftEnd, setConnDraftEnd] = useState<Point | null>(null)

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
    if (textInputRef.current) return

    if (tool === 'select') {
      if (e.target === stageRef.current) setSelectedId(null)
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
    const base = { id, strokeColor, fillColor, strokeWidth, strokeDash, opacity }

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
  }, [tool, strokeColor, fillColor, strokeWidth, strokeDash, opacity, stageScale, getPointerPos, addShape, setSelectedId, setConnStart, setConnDraftEnd])

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

    if (!drawing) return
    setDrawing(false)
    const shape = useStore.getState().shapes.find(s => s.id === draftId)
    if (shape) {
      if (shape.type === 'rect' && Math.abs(shape.width) < 3 && Math.abs(shape.height) < 3) {
        deleteShape(draftId!)
      } else if (shape.type === 'ellipse' && shape.radiusX < 2 && shape.radiusY < 2) {
        deleteShape(draftId!)
      }
    }
    setDraftId(null)
  }, [drawing, draftId, deleteShape, getPointerPos, stageScale, addShape, strokeColor, strokeWidth, setTool])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLTextAreaElement) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        deleteShape(selectedId)
      }
      if (e.key === 'Escape' && connStartRef.current) {
        connStartRef.current = null
        setConnStart(null)
        setConnDraftEnd(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, deleteShape, setConnStart, setConnDraftEnd])

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
        <Layer>
          {shapes.map((shape) =>
            shape.type === 'connector' ? (
              <ConnectorNode
                key={shape.id}
                shape={shape}
                shapes={shapes}
                isSelected={selectedId === shape.id}
                onSelect={() => {
                  if (tool === 'delete') { deleteShape(shape.id); return }
                  if (tool === 'select') setSelectedId(shape.id)
                }}
              />
            ) : (
              <ShapeNode
                key={shape.id}
                shape={shape}
                isSelected={selectedId === shape.id}
                onSelect={() => {
                  if (tool === 'delete') { deleteShape(shape.id); return }
                  if (tool === 'select') setSelectedId(shape.id)
                }}
                onChange={(patch) => updateShape(shape.id, patch)}
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

          {/* Línea draft mientras se dibuja un conector */}
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
        </Layer>
      </Stage>

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
