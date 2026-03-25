import { useState } from 'react'
import { DimensionPicker } from './DimensionPicker'
import type { DiagramTab, DimensionPreset } from '../types'
import { downloadPng, downloadSvg, downloadExcalidraw, downloadAllAsZip } from '../lib/export'

interface Props {
  activeDiagram: DiagramTab
  tabs: DiagramTab[]
  dimension: DimensionPreset
  onDimensionChange: (v: DimensionPreset) => void
  sidebarOpen: boolean
  onSidebarToggle: () => void
  presentMode: boolean
  onPresentToggle: () => void
}

export function Header({
  activeDiagram, tabs, dimension, onDimensionChange,
  sidebarOpen, onSidebarToggle, presentMode, onPresentToggle,
}: Props) {
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
    <header className="h-14 px-3 flex items-center gap-3 shrink-0"
      style={{ background: '#0A0A0A', borderBottom: '1px solid #262626' }}>

      {/* sidebar toggle */}
      <button
        onClick={onSidebarToggle}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="p-1.5 rounded-lg transition-colors shrink-0"
        style={{ color: sidebarOpen ? '#8b5cf6' : '#A3A3A3' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139,92,246,0.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = sidebarOpen ? '#8b5cf6' : '#A3A3A3'; e.currentTarget.style.background = 'transparent' }}
      >
        <SidebarIcon />
      </button>

      {/* logo + wordmark */}
      <div className="flex items-center gap-2 mr-1">
        <svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <rect x="0" y="0" width="512" height="512" rx="96" fill="#000000" />
          <rect x="118" y="210" width="276" height="170" rx="40" fill="none" stroke="#FFFFFF" strokeWidth="32" />
          <circle cx="208" cy="295" r="18" fill="#FFFFFF" />
          <circle cx="304" cy="295" r="18" fill="#FFFFFF" />
          <rect x="244" y="150" width="24" height="70" rx="12" fill="#FFFFFF" />
          <circle cx="256" cy="130" r="38" fill="#FFFFFF" />
          <circle cx="256" cy="130" r="18" fill="#000000" />
        </svg>
        <span
          className="text-sm font-bold tracking-tight hidden sm:block"
          style={{
            background: 'linear-gradient(90deg, #8b5cf6, #9333ea 50%, #84cc16)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Diagram Studio
        </span>
        <span
          className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full hidden sm:block"
          style={{ color: '#84cc16', background: 'rgba(132,204,22,0.10)', border: '1px solid rgba(132,204,22,0.30)' }}
        >
          Free
        </span>
      </div>

      {/* dimension picker */}
      <div className="hidden md:block">
        <DimensionPicker value={dimension} onChange={onDimensionChange} />
      </div>

      <div className="flex-1" />

      {/* present button — only when multiple diagrams */}
      {tabs.length > 1 && (
        <button
          onClick={onPresentToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
          style={presentMode
            ? { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.4)' }
            : { background: 'transparent', color: '#A3A3A3', border: '1px solid #262626' }
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.15)'
            e.currentTarget.style.color = '#8b5cf6'
            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'
          }}
          onMouseLeave={(e) => {
            if (!presentMode) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#A3A3A3'
              e.currentTarget.style.borderColor = '#262626'
            }
          }}
        >
          <PlayIcon />
          <span className="hidden sm:block">{presentMode ? 'Exit Present' : 'Present'}</span>
        </button>
      )}

      {/* export buttons */}
      {!presentMode && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs mr-0.5 hidden lg:block" style={{ color: '#525252' }}>Export:</span>
          <ExportButton label="PNG" loading={exporting === 'png'} onClick={() => handle('png', () => downloadPng(params, slug))} />
          <ExportButton label="SVG" loading={exporting === 'svg'} onClick={() => handle('svg', () => downloadSvg(params, slug))} />
          <ExportButton label=".excalidraw" loading={exporting === 'json'} onClick={() => handle('json', () => Promise.resolve(downloadExcalidraw(params, slug)))} />

          <div className="w-px h-5 mx-0.5 hidden sm:block" style={{ background: '#262626' }} />

          <button
            onClick={() => handle('zip', () => downloadAllAsZip(tabs))}
            disabled={!!exporting}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            style={{ background: '#84cc16', color: '#000000' }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            {exporting === 'zip' ? <Spinner /> : <DownloadIcon />}
            All (ZIP)
          </button>
        </div>
      )}
    </header>
  )
}

function ExportButton({ label, onClick, loading }: { label: string; onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-2 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-1"
      style={{ color: '#A3A3A3', border: '1px solid #262626', background: 'transparent' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#F5F5F5'
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'
        e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#A3A3A3'
        e.currentTarget.style.borderColor = '#262626'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {loading && <Spinner />}
      {label}
    </button>
  )
}

function SidebarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 2v12" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M4 2l10 6-10 6V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="10" height="10" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
    </svg>
  )
}
