import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { DiagramCanvas } from './components/DiagramCanvas'
import { PromptBar } from './components/PromptBar'
import { useDiagrams } from './hooks/useDiagrams'
import { generateDiagram, generateSeries } from './lib/generate'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'

export default function App() {
  const {
    tabs, activeId, activeDiagram, dimension,
    setActiveId, setDimension,
    addDiagram, addDiagramWithContent, deleteDiagram, renameDiagram, updateDiagram,
  } = useDiagrams()

  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [generating, setGenerating] = useState(false)
  const [seriesProgress, setSeriesProgress] = useState<{ current: number; total: number; title: string } | null>(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') ?? '')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [presentMode, setPresentMode] = useState(false)

  function handleApiKeyChange(key: string) {
    setApiKey(key)
    localStorage.setItem('anthropic_api_key', key)
  }

  const handleUpdate = useCallback(
    (elements: readonly ExcalidrawElement[], appState: Partial<AppState>, files: BinaryFiles) => {
      updateDiagram(activeId, elements, appState, files)
    },
    [activeId, updateDiagram]
  )

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawApiRef.current = api
  }, [])

  async function handleGenerate(prompt: string) {
    setGenerating(true)
    try {
      const newElements = await generateDiagram(prompt, apiKey)
      const current = excalidrawApiRef.current?.getSceneElements() ?? activeDiagram.elements
      const merged = [...current, ...(newElements as ExcalidrawElement[])]
      updateDiagram(activeId, merged, activeDiagram.appState, activeDiagram.files)
      excalidrawApiRef.current?.updateScene({ elements: merged })
      excalidrawApiRef.current?.scrollToContent(undefined, { fitToContent: true, animate: true })
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateSeries(prompt: string, count: number) {
    setGenerating(true)
    setSeriesProgress({ current: 0, total: count, title: '' })
    const firstId = { current: '' }
    try {
      const slides = await generateSeries(prompt, count, apiKey, (current, total, title) => {
        setSeriesProgress({ current, total, title })
      })
      slides.forEach((slide, i) => {
        const id = addDiagramWithContent(slide.title, slide.elements as ExcalidrawElement[])
        if (i === 0) firstId.current = id
      })
      // Select the first generated slide
      if (firstId.current) setActiveId(firstId.current)
    } finally {
      setGenerating(false)
      setSeriesProgress(null)
    }
  }

  // Presentation mode keyboard navigation
  useEffect(() => {
    if (!presentMode) return
    function onKey(e: KeyboardEvent) {
      const idx = tabs.findIndex((t) => t.id === activeId)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const next = tabs[idx + 1]
        if (next) setActiveId(next.id)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const prev = tabs[idx - 1]
        if (prev) setActiveId(prev.id)
      } else if (e.key === 'Escape') {
        setPresentMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentMode, activeId, tabs, setActiveId])

  const activeIdx = tabs.findIndex((t) => t.id === activeId)

  // ─── Presentation mode layout ────────────────────────────────────────────────
  if (presentMode) {
    return (
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#000000' }}>
        <DiagramCanvas
          diagram={activeDiagram}
          dimension={dimension}
          onUpdate={handleUpdate}
          onApiReady={handleApiReady}
        />

        {/* control bar */}
        <div
          className="shrink-0 flex items-center justify-center gap-4 px-6 py-3"
          style={{ background: 'rgba(0,0,0,0.9)', borderTop: '1px solid #1a1a1a' }}
        >
          <button
            onClick={() => { const prev = tabs[activeIdx - 1]; if (prev) setActiveId(prev.id) }}
            disabled={activeIdx === 0}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: '#A3A3A3' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F5F5F5' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#A3A3A3' }}
          >
            <PrevIcon />
          </button>

          <div className="flex items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className="w-2 h-2 rounded-full transition-all duration-150"
                style={{ background: t.id === activeId ? '#8b5cf6' : '#262626' }}
              />
            ))}
          </div>

          <span className="text-sm font-medium min-w-0 max-w-48 truncate" style={{ color: '#F5F5F5' }}>
            {activeDiagram.name}
          </span>

          <span className="text-xs" style={{ color: '#525252' }}>
            {activeIdx + 1} / {tabs.length}
          </span>

          <button
            onClick={() => { const next = tabs[activeIdx + 1]; if (next) setActiveId(next.id) }}
            disabled={activeIdx === tabs.length - 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: '#A3A3A3' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F5F5F5' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#A3A3A3' }}
          >
            <NextIcon />
          </button>

          <button
            onClick={() => setPresentMode(false)}
            className="ml-4 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: '#525252', border: '1px solid #262626' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.borderColor = '#525252' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#525252'; e.currentTarget.style.borderColor = '#262626' }}
          >
            Esc — Exit
          </button>
        </div>
      </div>
    )
  }

  // ─── Normal layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0A0A0A', color: '#F5F5F5' }}>
      <Header
        activeDiagram={activeDiagram}
        tabs={tabs}
        dimension={dimension}
        onDimensionChange={setDimension}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((v) => !v)}
        presentMode={presentMode}
        onPresentToggle={() => setPresentMode(true)}
      />

      <PromptBar
        onGenerate={handleGenerate}
        onGenerateSeries={handleGenerateSeries}
        generating={generating}
        seriesProgress={seriesProgress}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {sidebarOpen && (
          <Sidebar
            tabs={tabs}
            activeId={activeId}
            onSelect={setActiveId}
            onAdd={addDiagram}
            onDelete={deleteDiagram}
            onRename={renameDiagram}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <DiagramCanvas
          diagram={activeDiagram}
          dimension={dimension}
          onUpdate={handleUpdate}
          onApiReady={handleApiReady}
        />
      </div>
    </div>
  )
}

function PrevIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function NextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
