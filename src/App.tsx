import { useCallback } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { DiagramCanvas } from './components/DiagramCanvas'
import { useDiagrams } from './hooks/useDiagrams'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'

export default function App() {
  const {
    tabs,
    activeId,
    activeDiagram,
    dimension,
    setActiveId,
    setDimension,
    addDiagram,
    deleteDiagram,
    renameDiagram,
    updateDiagram,
  } = useDiagrams()

  const handleUpdate = useCallback(
    (elements: readonly ExcalidrawElement[], appState: Partial<AppState>, files: BinaryFiles) => {
      updateDiagram(activeId, elements, appState, files)
    },
    [activeId, updateDiagram]
  )

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Header
        activeDiagram={activeDiagram}
        tabs={tabs}
        dimension={dimension}
        onDimensionChange={setDimension}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          tabs={tabs}
          activeId={activeId}
          onSelect={setActiveId}
          onAdd={addDiagram}
          onDelete={deleteDiagram}
          onRename={renameDiagram}
        />

        <DiagramCanvas
          diagram={activeDiagram}
          dimension={dimension}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  )
}
