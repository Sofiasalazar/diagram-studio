import { useCallback, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { DiagramCanvas } from './components/DiagramCanvas'
import { PromptBar } from './components/PromptBar'
import { useDiagrams } from './hooks/useDiagrams'
import { generateDiagram } from './lib/generate'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
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

  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const [generating, setGenerating] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') ?? '')

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

      // Update persistent state
      updateDiagram(activeId, merged, activeDiagram.appState, activeDiagram.files)

      // Update the live canvas immediately
      excalidrawApiRef.current?.updateScene({ elements: merged })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Header
        activeDiagram={activeDiagram}
        tabs={tabs}
        dimension={dimension}
        onDimensionChange={setDimension}
      />

      <PromptBar
        onGenerate={handleGenerate}
        generating={generating}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
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
          onApiReady={handleApiReady}
        />
      </div>
    </div>
  )
}
