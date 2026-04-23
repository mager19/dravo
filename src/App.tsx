import { useEffect, useState } from 'react'
import { Canvas } from './Canvas'
import { Toolbar } from './Toolbar'
import { ColorPicker } from './ColorPicker'
import { StatusBar } from './StatusBar'
import { TextOptions } from './TextOptions'
import { ImportExportModal } from './ImportExportModal'
import { WelcomeModal } from './WelcomeModal'
import { useStore } from './store'
import type { TextShape } from './types'

function App() {
  const {
    tool, selectedIds, shapes, isLabelEditing,
    setStrokeColor, setFillColor, setStrokeWidth, setStrokeDash, setOpacity,
    setTextFontSize, setTextFontFamily, setTextBold, setTextItalic, setRoughEnabled,
  } = useStore()

  const [showJson, setShowJson] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('dravo:welcomed'))

  const handleCloseWelcome = () => {
    localStorage.setItem('dravo:welcomed', '1')
    setShowWelcome(false)
  }

  const selectedShape = selectedIds.length === 1 ? shapes.find(s => s.id === selectedIds[0]) : undefined
  const isTextSelected = selectedShape?.type === 'text'
  const showTextOptions = tool === 'text' || isTextSelected || isLabelEditing

  useEffect(() => {
    if (!selectedShape) return
    setStrokeColor(selectedShape.strokeColor)
    setFillColor(selectedShape.fillColor)
    setStrokeWidth(selectedShape.strokeWidth)
    setStrokeDash(selectedShape.strokeDash)
    setOpacity(selectedShape.opacity)
    setRoughEnabled(selectedShape.rough ?? false)
    if (isTextSelected) {
      const t = selectedShape as TextShape
      setTextFontSize(t.fontSize)
      setTextFontFamily(t.fontFamily)
      setTextBold(t.bold)
      setTextItalic(t.italic)
    }
  }, [selectedIds[0]])

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Canvas />
      <div className="absolute bottom-4 sm:bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-10 flex flex-col items-center gap-2">
        {showTextOptions && <TextOptions />}
        <Toolbar onOpenJson={() => setShowJson(true)} onOpenHelp={() => setShowWelcome(true)} />
        <ColorPicker />
      </div>
      <StatusBar />
      {showJson && <ImportExportModal onClose={() => setShowJson(false)} />}
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
    </div>
  )
}

export default App
