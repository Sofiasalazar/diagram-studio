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

  // CSS cannot reliably hide Excalidraw's welcome screen because Excalidraw's
  // vendor CSS may load after ours in Vite's bundle. Use a MutationObserver to
  // directly set display:none via inline style (which always wins over CSS).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function hide() {
      container!.querySelectorAll<HTMLElement>(
        '.welcome-screen, [class*="welcome-screen"]'
      ).forEach((el) => { el.style.display = 'none' })
    }
    hide()
    const observer = new MutationObserver(hide)
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] })
    return () => observer.disconnect()
  }, [])

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      onUpdate(elements, appState, files)
    },
    [onUpdate]
  )

  // Excalidraw only renders the welcome-screen (lock icon) when:
  //   activeTool.type === "selection" AND canvas is empty
  // Starting in "hand" (pan) mode on empty canvases prevents it entirely.
  // Once elements exist the condition is false and the tool can be anything.
  const isEmpty = diagram.elements.length === 0
  const initialAppState = {
    ...diagram.appState,
    theme: 'dark' as const,
    ...(isEmpty && {
      activeTool: {
        type: 'hand' as const,
        customType: null,
        locked: false,
        lastActiveTool: null,
      },
    }),
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
          excalidrawAPI={onApiReady}
          initialData={{
            elements: diagram.elements as ExcalidrawElement[],
            appState: initialAppState,
            files: diagram.files,
          }}
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: { export: false, saveAsImage: false },
          }}
        />
      </div>
    </div>
  )
}
