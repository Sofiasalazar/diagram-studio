import { DIMENSIONS, type DimensionPreset } from '../types'

interface Props {
  value: DimensionPreset
  onChange: (v: DimensionPreset) => void
}

export function DimensionPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
      {(Object.keys(DIMENSIONS) as DimensionPreset[]).map((key) => {
        const d = DIMENSIONS[key]
        const active = value === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            title={d.label + (d.width ? ` (${d.width}×${d.height})` : '')}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap
              ${active
                ? 'bg-violet-700 text-white shadow-sm shadow-violet-900'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }
            `}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}
