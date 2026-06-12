import { useStore } from './store'
import type { Shape } from './types'

const KEY = 'dravo:shapes'
let timer: ReturnType<typeof setTimeout> | null = null

function persist(shapes: Shape[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(shapes))
  } catch {
    // localStorage lleno o bloqueado — el canvas sigue funcionando en memoria
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) useStore.getState().setShapes(JSON.parse(raw) as Shape[])
  } catch {
    // JSON corrupto o storage inaccesible — se arranca con canvas vacío
  }
}

export function setupAutosave() {
  useStore.subscribe((state) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => persist(state.shapes), 500)
  })
  // flush inmediato al cerrar la pestaña: el debounce de 500ms podría
  // perder el último cambio
  window.addEventListener('beforeunload', () => {
    if (timer) clearTimeout(timer)
    persist(useStore.getState().shapes)
  })
}
