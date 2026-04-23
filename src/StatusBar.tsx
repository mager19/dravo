import { useState, useEffect } from 'react'
import { useStore } from './store'
import { T } from './i18n'

export function StatusBar() {
  const { tool, stageScale, lang } = useStore()
  const t = T[lang].statusBar
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: Math.round(e.clientX), y: Math.round(e.clientY) })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const toolName = t[tool as keyof typeof t] ?? tool

  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 hidden sm:flex gap-4 text-[11px] text-gray-500 select-none pointer-events-none">
      <span>{toolName}</span>
      <span>x:{mouse.x} y:{mouse.y}</span>
      <span>{t.zoom} {Math.round(stageScale * 100)}%</span>
    </div>
  )
}
