import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { DiagramCanvas } from './components/DiagramCanvas'
import { PromptBar } from './components/PromptBar'
import { useDiagrams } from './hooks/useDiagrams'
import { generateDiagram, generateSeries } from './lib/generate'
import type { GenerateUsage } from './lib/generate'
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
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const [seriesProgress, setSeriesProgress] = useState<{ current: number; total: number; title: string } | null>(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') ?? '')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [presentMode, setPresentMode] = useState(false)
  const [sessionUsage, setSessionUsage] = useState<GenerateUsage>({ input_tokens: 0, output_tokens: 0 })

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
    // After mount, zoom to fit content if there are elements
    setTimeout(() => {
      const els = api.getSceneElements()
      if (els.length > 0) {
        api.scrollToContent(els, { fitToViewport: true, viewportZoomFactor: 0.85, animate: false })
      }
    }, 100)
  }, [])

  async function handleGenerate(prompt: string) {
    setGenerating(true)
    try {
      const result = await generateDiagram(prompt, apiKey)
      const newElements = result.elements as ExcalidrawElement[]

      // Create a new tab -- Excalidraw will scroll-to-content on mount
      const tabName = prompt.slice(0, 30).trim() || 'Diagram'
      addDiagramWithContent(tabName, newElements)

      setSessionUsage((prev) => ({
        input_tokens: prev.input_tokens + result.usage.input_tokens,
        output_tokens: prev.output_tokens + result.usage.output_tokens,
      }))
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateSeries(prompt: string, count: number) {
    setGenerating(true)
    setSeriesProgress({ current: 0, total: count, title: '' })
    const firstId = { current: '' }
    try {
      const result = await generateSeries(prompt, count, apiKey, (current, total, title) => {
        setSeriesProgress({ current, total, title })
      })
      result.slides.forEach((slide, i) => {
        const id = addDiagramWithContent(slide.title, slide.elements as ExcalidrawElement[])
        if (i === 0) firstId.current = id
      })
      setSessionUsage((prev) => ({
        input_tokens: prev.input_tokens + result.usage.input_tokens,
        output_tokens: prev.output_tokens + result.usage.output_tokens,
      }))
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
      {/* Data notice banner */}
      {!noticeDismissed && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5" style={{ background: 'rgba(139,92,246,0.08)', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="#8b5cf6" strokeWidth="1.5"/>
            <path d="M8 5v4M8 11h.01" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-xs flex-1" style={{ color: '#A3A3A3' }}>
            This app has no database. Your diagram project lives only in this browser tab and is never sent to Agenticsis.
          </p>
          <button
            onClick={() => setNoticeDismissed(true)}
            className="text-xs font-medium px-2 py-1 rounded-lg transition-colors shrink-0"
            style={{ color: '#525252' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#A3A3A3' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#525252' }}
          >
            Dismiss
          </button>
        </div>
      )}

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
        sessionUsage={sessionUsage}
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

      {/* Footer CTA */}
      <div className="shrink-0 flex items-center justify-center px-4 py-2" style={{ background: '#0A0A0A', borderTop: '1px solid #262626' }}>
        <p className="text-xs" style={{ color: '#525252' }}>
          Want this tool for your brand?{' '}
          <a href="mailto:info@agenticsis.top" className="font-medium" style={{ color: '#8b5cf6' }}>
            info@agenticsis.top
          </a>
          {' '}&mdash; we build AI-powered tools for your business.
        </p>
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
