import { useCallback, useEffect } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { DiagramTab, DimensionPreset } from '../types'
import { DIMENSIONS } from '../types'

// Excalidraw forces showWelcomeScreen back to true in componentDidUpdate
// whenever elements are empty — so appState and updateScene both fail.
// The only fix is CSS, but Excalidraw's styles load after ours and win.
// Solution: inject a <style> tag dynamically at the END of <head> so it
// appears after all other styles and wins the cascade.
function useHideWelcomeScreen() {
  useEffect(() => {
    const id = 'excalidraw-no-welcome'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      .excalidraw .welcome-screen-center,
      .excalidraw .welcome-screen-menu,
      .excalidraw .welcome-screen-decor,
      .excalidraw .welcome-screen-decor-hint,
      .excalidraw .welcome-screen-decor-hint--toolbar,
      .excalidraw .welcome-screen-decor-hint--menu,
      .excalidraw .welcome-screen-decor-hint--help { display: none !important; }
    `
    document.head.appendChild(style)
  }, [])
}

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
  useHideWelcomeScreen()

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      onUpdate(elements, appState, files)
    },
    [onUpdate]
  )

  return (
    <div className="flex-1 flex flex-col items-center justify-start overflow-auto p-4 gap-3"
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
            appState: { ...diagram.appState, theme: 'dark' },
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
