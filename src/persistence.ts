import { useStore } from './store'
import type { Shape } from './types'

const KEY = 'linia:shapes'
let timer: ReturnType<typeof setTimeout> | null = null

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) useStore.getState().setShapes(JSON.parse(raw) as Shape[])
  } catch {}
}

export function setupAutosave() {
  useStore.subscribe((state) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state.shapes))
      } catch {}
    }, 500)
  })
}
