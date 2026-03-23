import { useState } from 'react'
import { DimensionPicker } from './DimensionPicker'
import type { DiagramTab, DimensionPreset } from '../types'
import {
  downloadPng,
  downloadSvg,
  downloadExcalidraw,
  downloadAllAsZip,
} from '../lib/export'

interface Props {
  activeDiagram: DiagramTab
  tabs: DiagramTab[]
  dimension: DimensionPreset
  onDimensionChange: (v: DimensionPreset) => void
}

export function Header({ activeDiagram, tabs, dimension, onDimensionChange }: Props) {
  const [exporting, setExporting] = useState<string | null>(null)

  async function handle(key: string, fn: () => Promise<void>) {
    setExporting(key)
    try { await fn() } finally { setExporting(null) }
  }

  const slug = activeDiagram.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const params = {
    elements: activeDiagram.elements,
    appState: activeDiagram.appState,
    files: activeDiagram.files,
  }

  return (
    <header className="h-14 px-4 flex items-center gap-4 bg-neutral-950 border-b border-neutral-800 shrink-0">
      {/* logo */}
      <div className="flex items-center gap-2.5 mr-2">
        {/* Agenticsis robot logo */}
        <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <rect x="0" y="0" width="512" height="512" rx="96" fill="#000000" />
          <rect x="118" y="210" width="276" height="170" rx="40" fill="none" stroke="#FFFFFF" strokeWidth="32" />
          <circle cx="208" cy="295" r="18" fill="#FFFFFF" />
          <circle cx="304" cy="295" r="18" fill="#FFFFFF" />
          <rect x="244" y="150" width="24" height="70" rx="12" fill="#FFFFFF" />
          <circle cx="256" cy="130" r="38" fill="#FFFFFF" />
          <circle cx="256" cy="130" r="18" fill="#000000" />
        </svg>
        <span className="text-sm font-semibold text-white tracking-tight">Diagram Studio</span>
        <span className="text-neutral-600 text-xs">by Agenticsis</span>
      </div>

      {/* dimension picker */}
      <DimensionPicker value={dimension} onChange={onDimensionChange} />

      <div className="flex-1" />

      {/* export buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-600 mr-1">Export:</span>

        <ExportButton
          label="PNG"
          loading={exporting === 'png'}
          onClick={() => handle('png', () => downloadPng(params, slug))}
        />
        <ExportButton
          label="SVG"
          loading={exporting === 'svg'}
          onClick={() => handle('svg', () => downloadSvg(params, slug))}
        />
        <ExportButton
          label=".excalidraw"
          loading={exporting === 'json'}
          onClick={() => handle('json', () => Promise.resolve(downloadExcalidraw(params, slug)))}
        />

        <div className="w-px h-5 bg-neutral-800 mx-1" />

        <button
          onClick={() => handle('zip', () => downloadAllAsZip(tabs))}
          disabled={!!exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-lime-500/10 text-lime-400 border border-lime-500/30
            hover:bg-lime-500/20 hover:border-lime-500/60
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150"
        >
          {exporting === 'zip' ? (
            <Spinner />
          ) : (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          Download All (ZIP)
        </button>
      </div>
    </header>
  )
}

function ExportButton({ label, onClick, loading }: { label: string; onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium
        text-neutral-400 border border-neutral-800
        hover:text-white hover:border-neutral-600 hover:bg-neutral-800
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-150 flex items-center gap-1"
    >
      {loading && <Spinner />}
      {label}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="10" height="10" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
    </svg>
  )
}
