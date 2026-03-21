import { useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
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
}

export function DiagramCanvas({ diagram, dimension, onUpdate }: Props) {
  const dim = DIMENSIONS[dimension]

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      onUpdate(elements, appState, files)
    },
    [onUpdate]
  )

  return (
    <div className="flex-1 flex flex-col items-center justify-start bg-neutral-900 overflow-auto p-4 gap-3">
      {/* dimension badge */}
      {dim.width && (
        <div className="shrink-0 flex items-center gap-2 text-xs text-neutral-500">
          <div className="h-px w-8 bg-neutral-700" />
          <span className="font-medium text-neutral-400">{dim.label}</span>
          <span className="text-neutral-600">{dim.width} × {dim.height}</span>
          <div className="h-px w-8 bg-neutral-700" />
        </div>
      )}

      {/* canvas wrapper */}
      <div
        className="relative bg-white rounded-lg overflow-hidden shadow-2xl shadow-black/60"
        style={
          dim.width && dim.height
            ? { width: dim.width, height: dim.height, minWidth: dim.width, minHeight: dim.height }
            : { width: '100%', height: '100%', flex: 1, minHeight: 0 }
        }
      >
        <Excalidraw
          key={diagram.id}
          initialData={{
            elements: diagram.elements as ExcalidrawElement[],
            appState: { ...diagram.appState, theme: 'dark' },
            files: diagram.files,
          }}
          onChange={handleChange}
          theme="dark"
          UIOptions={{
            canvasActions: {
              export: false,
              saveAsImage: false,
            },
          }}
        />
      </div>
    </div>
  )
}
