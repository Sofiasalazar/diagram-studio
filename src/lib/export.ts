import { exportToBlob, exportToSvg } from '@excalidraw/excalidraw'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { DiagramTab } from '../types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'

interface ExportParams {
  elements: readonly ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

export async function downloadPng(params: ExportParams, filename: string) {
  const blob = await exportToBlob({
    elements: params.elements,
    appState: { ...params.appState, exportBackground: true },
    files: params.files,
    mimeType: 'image/png',
  })
  saveAs(blob, `${filename}.png`)
}

export async function downloadSvg(params: ExportParams, filename: string) {
  const svg = await exportToSvg({
    elements: params.elements,
    appState: { ...params.appState, exportBackground: true },
    files: params.files,
  })
  const serialized = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([serialized], { type: 'image/svg+xml' })
  saveAs(blob, `${filename}.svg`)
}

export function downloadExcalidraw(params: ExportParams, filename: string) {
  const data = JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'https://diagram-studio.agenticsis.top',
    elements: params.elements,
    appState: params.appState,
    files: params.files,
  }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  saveAs(blob, `${filename}.excalidraw`)
}

export async function downloadAllAsZip(tabs: DiagramTab[]) {
  const zip = new JSZip()

  for (const tab of tabs) {
    const slug = tab.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const params: ExportParams = {
      elements: tab.elements,
      appState: tab.appState,
      files: tab.files,
    }

    // PNG
    const pngBlob = await exportToBlob({
      elements: params.elements,
      appState: { ...params.appState, exportBackground: true },
      files: params.files,
      mimeType: 'image/png',
    })
    zip.file(`${slug}.png`, pngBlob)

    // SVG
    const svg = await exportToSvg({
      elements: params.elements,
      appState: { ...params.appState, exportBackground: true },
      files: params.files,
    })
    const svgString = new XMLSerializer().serializeToString(svg)
    zip.file(`${slug}.svg`, svgString)

    // .excalidraw
    const jsonData = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: 'https://diagram-studio.agenticsis.top',
      elements: params.elements,
      appState: params.appState,
      files: params.files,
    }, null, 2)
    zip.file(`${slug}.excalidraw`, jsonData)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'diagrams.zip')
}
