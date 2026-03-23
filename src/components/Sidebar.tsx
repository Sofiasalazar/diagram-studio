import { useState, useRef, useEffect } from 'react'
import type { DiagramTab } from '../types'

interface Props {
  tabs: DiagramTab[]
  activeId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

function DiagramItem({
  tab,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  tab: DiagramTab
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tab.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed) onRename(trimmed)
    else setDraft(tab.name)
    setEditing(false)
  }

  return (
    <div
      onClick={onSelect}
      className="group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
      style={isActive ? {
        background: 'rgba(139,92,246,0.08)',
        border: '1px solid rgba(139,92,246,0.4)',
        color: '#F5F5F5',
        boxShadow: '0 0 16px rgba(139,92,246,0.12)',
      } : {
        background: 'transparent',
        border: '1px solid transparent',
        color: '#A3A3A3',
      }}
    >
      {/* diagram icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
        style={isActive
          ? { background: 'rgba(139,92,246,0.20)', color: '#8b5cf6' }
          : { background: 'rgba(255,255,255,0.04)', color: '#525252' }
        }
      >
        {tab.name.slice(0, 1).toUpperCase()}
      </div>

      {/* name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setDraft(tab.name); setEditing(false) }
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-neutral-900 border border-violet-500 rounded px-1.5 py-0.5 text-sm text-white outline-none"
          />
        ) : (
          <span className="block truncate text-sm font-medium">{tab.name}</span>
        )}
      </div>

      {/* actions */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true) }}
          title="Rename"
          className="p-1 rounded hover:bg-neutral-700 text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          <PencilIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Delete"
          className="p-1 rounded hover:bg-red-900/40 text-neutral-500 hover:text-red-400 transition-colors"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ tabs, activeId, onSelect, onAdd, onDelete, onRename }: Props) {
  return (
    <aside className="w-60 shrink-0 flex flex-col h-full"
      style={{ background: '#0A0A0A', borderRight: '1px solid #262626' }}>
      {/* header */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#525252' }}>Diagrams</p>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {tabs.map((tab) => (
          <DiagramItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            onSelect={() => onSelect(tab.id)}
            onDelete={() => onDelete(tab.id)}
            onRename={(name) => onRename(tab.id, name)}
          />
        ))}
      </div>

      {/* new diagram */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid #1a1a1a' }}>
        <button
          onClick={onAdd}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold
            transition-all duration-150"
          style={{ background: '#84cc16', color: '#000000' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New Diagram
        </button>
      </div>
    </aside>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
