import { useState } from 'react'
import { X, Copy, Check, Upload } from 'lucide-react'
import { useStore } from './store'
import { T } from './i18n'
import { sanitizeShapes } from './sanitize'

export function ImportExportModal({ onClose }: { onClose: () => void }) {
  const { shapes, setShapes, lang } = useStore()
  const t = T[lang].importExport
  const [tab, setTab] = useState<'export' | 'import'>('export')
  const [copied, setCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const json = JSON.stringify(shapes, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImport = () => {
    setError(null)
    try {
      const parsed = JSON.parse(importText)
      const sanitized = sanitizeShapes(parsed, lang)
      if (sanitized.length === 0) { setError(t.noShapes); return }
      setShapes(sanitized)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t.invalidJson)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#22242f] border border-[#3a3d4d] rounded-xl shadow-2xl w-[580px] max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-3 border-b border-[#3a3d4d]">
          <div className="flex gap-1">
            {(['export', 'import'] as const).map((tab_) => (
              <button key={tab_} onClick={() => { setTab(tab_); setError(null) }}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  tab === tab_ ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}>
                {tab_ === 'export' ? t.exportTab : t.importTab}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        {tab === 'export' ? (
          <>
            <textarea readOnly value={json}
              className="flex-1 bg-[#1a1b23] text-gray-300 text-xs font-mono p-4 resize-none outline-none min-h-[300px]" />
            <div className="px-5 py-3 border-t border-[#3a3d4d] flex items-center justify-between">
              <span className="text-xs text-gray-500">{shapes.length} {t.shapes}</span>
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t.copied : t.copy}
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea value={importText} onChange={(e) => { setImportText(e.target.value); setError(null) }}
              placeholder={t.placeholder} spellCheck={false}
              className="flex-1 bg-[#1a1b23] text-gray-300 text-xs font-mono p-4 resize-none outline-none min-h-[300px] placeholder-gray-600" />
            {error && <div className="px-5 py-2 text-red-400 text-xs border-t border-[#3a3d4d]">{error}</div>}
            <div className="px-5 py-3 border-t border-[#3a3d4d] flex items-center justify-between">
              <span className="text-xs text-gray-500">{t.hint}</span>
              <button onClick={handleImport} disabled={!importText.trim()}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors">
                <Upload size={14} />
                {t.apply}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
