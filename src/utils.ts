const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function nanoid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let id = ''
  for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length]
  return id
}

// Medición real de texto con un canvas 2D offscreen (mismo motor que usa
// Konva para renderizar, así las medidas coinciden). Konva.Text usa
// lineHeight 1 por defecto → alto = líneas × fontSize.
let measureCtx: CanvasRenderingContext2D | null = null

export function measureTextSize(
  text: string, fontSize: number, fontFamily: string, bold: boolean, italic: boolean
): { w: number; h: number } {
  const lines = text.split('\n')
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) {
    // sin canvas disponible: aproximación anterior
    return { w: Math.max(...lines.map(l => l.length)) * fontSize * 0.55, h: lines.length * fontSize }
  }
  measureCtx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`
  const w = Math.max(...lines.map(l => measureCtx!.measureText(l).width))
  return { w, h: lines.length * fontSize }
}
