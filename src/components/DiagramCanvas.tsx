import { useCallback, useEffect, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { DiagramTab, DimensionPreset } from '../types'
import { DIMENSIONS } from '../types'

interface Props {
  diagram: DiagramTab
  dimension: DimensionPreset
  onUpdate: (
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles
  ) => void
  onApiReady?: (api: ExcalidrawImperativeAPI) => void
}

export function DiagramCanvas({ diagram, dimension, onUpdate, onApiReady }: Props) {
  const dim = DIMENSIONS[dimension]
  const containerRef = useRef<HTMLDivElement>(null)

  // MutationObserver: hide Excalidraw's welcome screen and toolbar
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function hide() {
      container!.querySelectorAll<HTMLElement>(
        '.welcome-screen, [class*="welcome-screen"], ' +
        '.App-toolbar, .App-toolbar-content, .App-toolbar-container, ' +
        '.shapes-section, .App-menu_top, .App-bottom-bar, ' +
        '.context-menu-container, .excalidraw-contextMenuContainer, ' +
        '[class*="context-menu"], .zen-mode-transition, .disable-zen-mode, ' +
        '.layer-ui__wrapper__footer'
      ).forEach((el) => { el.style.display = 'none' })
    }
    hide()
    const observer = new MutationObserver(hide)
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] })
    return () => observer.disconnect()
  }, [])

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    onApiReady?.(api)
  }, [onApiReady])

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      onUpdate(elements, appState, files)
    },
    [onUpdate]
  )

  const initialAppState = {
    ...diagram.appState,
    theme: 'light' as const,
    viewBackgroundColor: '#ffffff',
    zenModeEnabled: false,
    activeTool: {
      type: 'hand' as const,
      customType: null,
      locked: false,
      lastActiveTool: null,
    },
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-start overflow-auto p-4 gap-3"
      style={{ background: '#111111' }}>

      {/* dimension badge */}
      {dim.width && (
        <div className="shrink-0 flex items-center gap-2 text-xs" style={{ color: '#525252' }}>
          <div className="h-px w-8" style={{ background: '#262626' }} />
          <span className="font-medium" style={{ color: '#A3A3A3' }}>{dim.label}</span>
          <span>{dim.width} × {dim.height}</span>
          <div className="h-px w-8" style={{ background: '#262626' }} />
        </div>
      )}

      {/* canvas wrapper */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          ...(dim.width && dim.height
            ? { width: dim.width, height: dim.height, minWidth: dim.width, minHeight: dim.height }
            : { width: '100%', height: '100%', flex: 1, minHeight: 0 }),
          boxShadow: '0 0 0 1px #262626, 0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
        <Excalidraw
          key={diagram.id}
          excalidrawAPI={handleApiReady}
          initialData={{
            elements: diagram.elements as ExcalidrawElement[],
            appState: initialAppState,
            files: diagram.files,
          }}
          onChange={handleChange}
          theme="light"
          UIOptions={{
            canvasActions: { export: false, saveAsImage: false, clearCanvas: false },
          }}
        />
        {/* Empty-state overlay — covers Excalidraw's default padlock illustration */}
        {diagram.elements.length === 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
            style={{ background: '#ffffff' }}
          >
            <div className="flex flex-col items-center gap-3 opacity-60">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="10" width="32" height="20" rx="4" stroke="#8b5cf6" strokeWidth="1.5"/>
                <path d="M12 20h16M20 14v12" stroke="#84cc16" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm font-medium" style={{ color: '#999999' }}>
                Type a prompt above to generate your diagram
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
