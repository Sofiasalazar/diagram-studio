import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'

export interface DiagramTab {
  id: string
  name: string
  elements: readonly ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

export type DimensionPreset =
  | 'phone-portrait'
  | 'phone-landscape'
  | 'desktop-hd'
  | 'desktop-full'
  | 'free'

export interface DimensionConfig {
  label: string
  width: number | null
  height: number | null
  icon: string
}

export const DIMENSIONS: Record<DimensionPreset, DimensionConfig> = {
  'phone-portrait': { label: 'Phone Portrait', width: 390, height: 844, icon: '📱' },
  'phone-landscape': { label: 'Phone Landscape', width: 844, height: 390, icon: '📱' },
  'desktop-hd': { label: 'Desktop HD', width: 1280, height: 720, icon: '🖥' },
  'desktop-full': { label: 'Desktop Full', width: 1920, height: 1080, icon: '🖥' },
  'free': { label: 'Free Canvas', width: null, height: null, icon: '∞' },
}
