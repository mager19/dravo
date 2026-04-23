# Dravo

A minimal, fast canvas drawing tool for the web. Shapes, connectors, freehand, text — everything you need to sketch ideas and build diagrams without friction.

## Features

**Drawing tools**
- Rectangle, ellipse, line, arrow, freehand, text
- Smart connectors that snap to anchor points and follow shapes when moved

**Styling**
- Stroke and fill color picker with custom hex input
- Stroke style — solid, dotted, dashed, long dash
- Stroke width — 1, 2, 4, 8px
- Opacity control

**Text**
- Inline text editing on the canvas
- Font, size, bold, italic
- Includes PxPlus IBM VGA8 monospace font

**Canvas**
- Infinite canvas with zoom and pan
- Select, move, and resize shapes with handles
- Undo / Redo

**Export & persistence**
- Export to PNG (2x resolution)
- Export canvas as JSON — share and restore full diagrams
- Import JSON with strict sanitization
- Auto-saves to localStorage

**Responsive**
- Toolbar and color picker adapt to mobile screen widths
- Essential tools visible by default, secondary tools hidden on small screens
- Scrollable bars for full access on any device

**Keyboard shortcuts**

| Key | Action |
|-----|--------|
| `V` | Select |
| `R` | Rectangle |
| `O` | Ellipse |
| `L` | Line |
| `A` | Arrow |
| `D` | Freehand |
| `T` | Text |
| `C` | Connector |
| `Del` / `Backspace` | Delete selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Scroll` | Zoom |
| `Alt+Drag` | Pan |

## Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Konva](https://konvajs.org/) / [react-konva](https://konvajs.org/docs/react/)
- [perfect-freehand](https://github.com/steveruizok/perfect-freehand)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS v4](https://tailwindcss.com/)

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## JSON format

Dravo diagrams are plain JSON arrays. Each object is a shape:

```json
[
  {
    "type": "rect",
    "id": "r1",
    "x": 100, "y": 100, "width": 200, "height": 120,
    "strokeColor": "#3b82f6", "fillColor": "#1e3a5f",
    "strokeWidth": 2, "strokeDash": "solid", "opacity": 1
  },
  {
    "type": "connector",
    "id": "c1",
    "start": { "shapeId": "r1", "anchor": "e", "x": 300, "y": 160 },
    "end":   { "shapeId": "e2", "anchor": "w", "x": 400, "y": 200 },
    "strokeColor": "#a855f7", "fillColor": "transparent",
    "strokeWidth": 2, "strokeDash": "dashed", "opacity": 1
  }
]
```

**Shape types:** `rect` · `ellipse` · `line` · `arrow` · `freehand` · `text` · `connector`

**Anchor sides:** `n` · `s` · `e` · `w` · `center`

Imported JSON is validated and sanitized before being applied — invalid or malformed shapes are skipped silently.

## License

MIT
