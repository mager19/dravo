import { useState, useRef } from 'react'

interface TooltipProps {
  label: string
  shortcut?: string
  className?: string
  children: React.ReactNode
}

export function Tooltip({ label, shortcut, className, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { timer.current = setTimeout(() => setVisible(true), 450) }
  const hide = () => { if (timer.current) clearTimeout(timer.current); setVisible(false) }

  return (
    <div className={`relative ${className ?? ''}`} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 pointer-events-none">
          <div className="bg-[#0d0e14] border border-[#3a3d4d] rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-xl whitespace-nowrap">
            <span className="text-xs text-gray-200">{label}</span>
            {shortcut && (
              <kbd className="text-[10px] font-mono bg-[#1a1b23] border border-[#3a3d4d] text-blue-300 px-1.5 py-0.5 rounded">
                {shortcut}
              </kbd>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#3a3d4d]" />
        </div>
      )}
    </div>
  )
}
