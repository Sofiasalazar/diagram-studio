import { useState, useRef, useEffect } from 'react'
import type { GenerateUsage } from '../lib/generate'

interface Props {
  onGenerate: (prompt: string) => Promise<void>
  onGenerateSeries: (prompt: string, count: number) => Promise<void>
  generating: boolean
  seriesProgress: { current: number; total: number; title: string } | null
  apiKey: string
  onApiKeyChange: (key: string) => void
  sessionUsage: GenerateUsage
}

const INPUT_COST_PER_MTOK = 15   // $15 per million input tokens (claude-opus-4-6)
const OUTPUT_COST_PER_MTOK = 75  // $75 per million output tokens

function formatCost(usage: GenerateUsage): string {
  const cost = (usage.input_tokens * INPUT_COST_PER_MTOK + usage.output_tokens * OUTPUT_COST_PER_MTOK) / 1_000_000
  if (cost < 0.001) return '< $0.001'
  return `$${cost.toFixed(3)}`
}

function formatNum(n: number): string {
  return n.toLocaleString()
}

export function PromptBar({
  onGenerate, onGenerateSeries, generating, seriesProgress, apiKey, onApiKeyChange, sessionUsage,
}: Props) {
  const [prompt, setPrompt] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seriesMode, setSeriesMode] = useState(false)
  const [slideCount, setSlideCount] = useState(3)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [prompt])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || generating) return
    if (!apiKey.trim()) { setError('Enter your Anthropic API key first.'); return }
    setError(null)
    try {
      if (seriesMode) {
        await onGenerateSeries(prompt.trim(), slideCount)
      } else {
        await onGenerate(prompt.trim())
      }
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const hasUsage = sessionUsage.input_tokens > 0

  return (
    <div className="px-4 py-3" style={{ background: '#0A0A0A', borderBottom: '1px solid #262626' }}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">

        {/* API key row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold tracking-wide shrink-0" style={{ color: '#525252' }}>API Key</span>
          <div className="relative" style={{ width: 260 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-1.5 rounded-xl text-xs font-mono outline-none transition-all duration-150"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #262626', color: '#F5F5F5' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#262626' }}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#525252' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#A3A3A3' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#525252' }}
            >
              {showKey ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <p className="text-xs hidden sm:block" style={{ color: '#525252' }}>
            Stored in browser — sent directly to Anthropic.
          </p>

          {/* Session token + cost counter */}
          {hasUsage && (
            <div className="ml-auto flex items-center gap-3 text-xs shrink-0">
              <span style={{ color: '#525252' }}>
                <span style={{ color: '#A3A3A3' }}>{formatNum(sessionUsage.input_tokens)}</span> in
                {' / '}
                <span style={{ color: '#A3A3A3' }}>{formatNum(sessionUsage.output_tokens)}</span> out tokens
              </span>
              <span
                className="px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(132,204,22,0.10)', color: '#84cc16', border: '1px solid rgba(132,204,22,0.25)' }}
              >
                {formatCost(sessionUsage)}
              </span>
            </div>
          )}
        </div>

        {/* Mode switcher: Single Diagram / Slide Deck */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide shrink-0" style={{ color: '#525252' }}>Mode</span>
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #262626' }}>
            <button
              type="button"
              onClick={() => setSeriesMode(false)}
              className="px-3 py-1.5 text-xs font-semibold transition-all duration-150"
              style={!seriesMode
                ? { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }
                : { background: 'transparent', color: '#525252' }
              }
            >
              Single Diagram
            </button>
            <div style={{ width: 1, background: '#262626' }} />
            <button
              type="button"
              onClick={() => setSeriesMode(true)}
              className="px-3 py-1.5 text-xs font-semibold transition-all duration-150"
              style={seriesMode
                ? { background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }
                : { background: 'transparent', color: '#525252' }
              }
            >
              Slide Deck
            </button>
          </div>

          {/* Slide count stepper — only visible in Slide Deck mode */}
          {seriesMode && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs" style={{ color: '#525252' }}>Slides:</span>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid #262626' }}>
                <button
                  type="button"
                  onClick={() => setSlideCount((n) => Math.max(2, n - 1))}
                  disabled={slideCount <= 2}
                  className="px-2.5 py-1.5 text-sm font-bold transition-colors disabled:opacity-30"
                  style={{ color: '#A3A3A3', background: 'transparent' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.color = '#8b5cf6' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#A3A3A3' }}
                >
                  −
                </button>
                <span
                  className="px-3 py-1.5 text-xs font-bold min-w-[2rem] text-center"
                  style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.08)', borderLeft: '1px solid #262626', borderRight: '1px solid #262626' }}
                >
                  {slideCount}
                </span>
                <button
                  type="button"
                  onClick={() => setSlideCount((n) => Math.min(8, n + 1))}
                  disabled={slideCount >= 8}
                  className="px-2.5 py-1.5 text-sm font-bold transition-colors disabled:opacity-30"
                  style={{ color: '#A3A3A3', background: 'transparent' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.color = '#8b5cf6' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#A3A3A3' }}
                >
                  +
                </button>
              </div>
              <span className="text-xs" style={{ color: '#525252' }}>
                {slideCount === 1 ? 'slide' : 'slides'} — each generated individually
              </span>
            </div>
          )}
        </div>

        {/* Prompt + generate button */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              seriesMode
                ? `Describe a topic for ${slideCount} slides... (e.g. "Product launch roadmap", "Onboarding flow")    Enter to generate`
                : 'Describe a diagram... (e.g. user login flowchart, microservices architecture)    Enter to generate'
            }
            rows={1}
            className="flex-1 resize-none px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150 leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #262626', color: '#F5F5F5' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#262626' }}
          />

          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            style={{ background: '#84cc16', color: '#000000' }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            {generating ? (
              <>
                <Spinner />
                <span className="hidden sm:block">
                  {seriesProgress ? `${seriesProgress.current}/${seriesProgress.total}` : 'Generating'}
                </span>
              </>
            ) : (
              <>
                <SparklesIcon />
                <span className="hidden sm:block">{seriesMode ? `Generate ${slideCount} Slides` : 'Generate'}</span>
              </>
            )}
          </button>
        </div>

        {/* Series progress bar */}
        {seriesProgress && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(seriesProgress.current / seriesProgress.total) * 100}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #84cc16)',
                }}
              />
            </div>
            <span className="text-xs shrink-0" style={{ color: '#A3A3A3' }}>
              Slide {seriesProgress.current}/{seriesProgress.total}
              {seriesProgress.title ? ` — "${seriesProgress.title}"` : ''}
            </span>
          </div>
        )}

        {error && <p className="text-xs px-1" style={{ color: '#f87171' }}>{error}</p>}
      </form>
    </div>
  )
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11l-1.5-3.5L3 6l3.5-1.5L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M13 10l.75 1.75L15.5 12.5l-1.75.75L13 15l-.75-1.75L10.5 12.5l1.75-.75L13 10z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0010.4 9.5M5 4.2C2.7 5.4 1 8 1 8s3 5 7 5a7 7 0 003.8-1.2M9 3.2A7 7 0 0115 8s-.7 1.3-2 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
