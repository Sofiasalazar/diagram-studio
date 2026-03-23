import { useState, useRef, useEffect } from 'react'

interface Props {
  onGenerate: (prompt: string) => Promise<void>
  generating: boolean
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function PromptBar({ onGenerate, generating, apiKey, onApiKeyChange }: Props) {
  const [prompt, setPrompt] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [prompt])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || generating) return
    if (!apiKey.trim()) {
      setError('Enter your Anthropic API key first.')
      return
    }
    setError(null)
    try {
      await onGenerate(prompt.trim())
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

  return (
    <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* API key row */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-600 shrink-0">API Key</span>
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300
                placeholder-neutral-600 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600/30
                transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              {showKey ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <p className="text-xs text-neutral-400 mt-1 pl-1">
            Your key is saved only in this browser and sent directly to Anthropic — never to our servers.
          </p>
        </div>

        {/* Prompt row */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a diagram... (e.g. user login flowchart, API architecture, sales funnel)    Press Enter to generate"
              rows={1}
              className="w-full resize-none bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200
                placeholder-neutral-600 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600/30
                transition-colors leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold
              bg-lime-500/10 text-lime-400 border border-lime-500/30
              hover:bg-lime-500/20 hover:border-lime-500/60
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150"
          >
            {generating ? (
              <>
                <Spinner />
                Generating
              </>
            ) : (
              <>
                <SparklesIcon />
                Generate
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 px-1">{error}</p>
        )}
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
