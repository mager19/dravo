import { useEffect, useState } from 'react'
import { Canvas } from './Canvas'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'
import { ImportExportModal } from './ImportExportModal'
import { WelcomeModal } from './WelcomeModal'
import { LayersPanel } from './LayersPanel'
import { ColorPicker } from './ColorPicker'
import { TextOptions } from './TextOptions'
import { ConnectorOptions } from './ConnectorOptions'
import { GroupOptions } from './GroupOptions'
import { useStore } from './store'
import type { TextShape } from './types'

function App() {
  const tool = useStore(s => s.tool)
  const isLabelEditing = useStore(s => s.isLabelEditing)
  const theme = useStore(s => s.theme)
  // El selector devuelve el objeto del shape: misma referencia mientras ese
  // shape no cambie — App no se re-renderiza por cambios ajenos del store
  const selectedShape = useStore(s =>
    s.selectedIds.length === 1 ? s.shapes.find(sh => sh.id === s.selectedIds[0]) : undefined
  )
  // Acciones: referencias estables, sin suscripción
  const {
    setStrokeColor, setFillColor, setStrokeWidth, setStrokeDash, setOpacity,
    setTextFontSize, setTextFontFamily, setTextBold, setTextItalic, setRoughEnabled,
  } = useStore.getState()

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])

  const [showJson, setShowJson] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('dravo:welcomed'))
  const [showLayers, setShowLayers] = useState(false)
  const [showOptions, setShowOptions] = useState(true)

  const handleCloseWelcome = () => {
    localStorage.setItem('dravo:welcomed', '1')
    setShowWelcome(false)
  }

  const isTextSelected = selectedShape?.type === 'text'
  const showTextOptions = tool === 'text' || isTextSelected || isLabelEditing
  const showConnectorOptions = !!(selectedShape?.type === 'connector')

  // Sincroniza los pickers con el shape al cambiar la selección — corre solo
  // en ese momento, a propósito: los setters de estilo escriben sobre la
  // selección y re-ejecutar este efecto en cada cambio de store haría eco
  const primarySelectedId = selectedShape?.id
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primarySelectedId])

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Canvas />
      <div className="absolute bottom-4 sm:bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-10 flex flex-col items-center gap-2">
        {showOptions && showTextOptions && <TextOptions />}
        {showOptions && showConnectorOptions && <ConnectorOptions />}
        <GroupOptions />
        <Toolbar
          onOpenJson={() => setShowJson(true)}
          onOpenHelp={() => setShowWelcome(true)}
          onOpenLayers={() => setShowLayers(v => !v)}
          layersOpen={showLayers}
          optionsOpen={showOptions}
          onToggleOptions={() => setShowOptions(v => !v)}
        />
        {showOptions && <ColorPicker />}
      </div>
      <StatusBar />
      {showLayers && <LayersPanel onClose={() => setShowLayers(false)} />}
      {showJson && <ImportExportModal onClose={() => setShowJson(false)} />}
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
    </div>
  )
}

export default App
