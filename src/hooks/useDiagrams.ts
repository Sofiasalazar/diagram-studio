import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import type { DiagramTab, DimensionPreset } from '../types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'

function createDiagram(name: string): DiagramTab {
  return {
    id: nanoid(),
    name,
    elements: [],
    appState: { theme: 'dark' },
    files: {},
  }
}

export function useDiagrams() {
  const [tabs, setTabs] = useState<DiagramTab[]>([createDiagram('Diagram 1')])
  const [activeId, setActiveId] = useState<string>(() => tabs[0].id)
  const [dimension, setDimension] = useState<DimensionPreset>('desktop-hd')

  const activeDiagram = tabs.find((t) => t.id === activeId) ?? tabs[0]

  const addDiagram = useCallback(() => {
    const d = createDiagram(`Diagram ${tabs.length + 1}`)
    setTabs((prev) => [...prev, d])
    setActiveId(d.id)
  }, [tabs.length])

  const deleteDiagram = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length === 1) return prev
      const next = prev.filter((t) => t.id !== id)
      return next
    })
    setActiveId((prev) => {
      if (prev !== id) return prev
      const remaining = tabs.filter((t) => t.id !== id)
      return remaining[0]?.id ?? ''
    })
  }, [tabs])

  const renameDiagram = useCallback((id: string, name: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name } : t))
    )
  }, [])

  const updateDiagram = useCallback((
    id: string,
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, elements, appState: { ...t.appState, ...appState }, files } : t
      )
    )
  }, [])

  return {
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
  }
}
