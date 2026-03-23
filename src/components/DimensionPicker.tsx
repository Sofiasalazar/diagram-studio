import { DIMENSIONS, type DimensionPreset } from '../types'

interface Props {
  value: DimensionPreset
  onChange: (v: DimensionPreset) => void
}

export function DimensionPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-xl p-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #262626' }}>
      {(Object.keys(DIMENSIONS) as DimensionPreset[]).map((key) => {
        const d = DIMENSIONS[key]
        const active = value === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            title={d.label + (d.width ? ` (${d.width}×${d.height})` : '')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap"
            style={active ? {
              background: 'linear-gradient(135deg, #8b5cf6, #9333ea)',
              color: '#ffffff',
            } : {
              color: '#A3A3A3',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#F5F5F5' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#A3A3A3' }}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}
