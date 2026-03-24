import Anthropic from '@anthropic-ai/sdk'
import { nanoid } from 'nanoid'

// ─── Shared prompt fragments ──────────────────────────────────────────────────

const JSON_RULES = `CRITICAL FORMATTING RULES:
- Output ONLY raw JSON — no explanation, no markdown, no code fences.
- ALL property names MUST use double quotes. NEVER single quotes or bare identifiers.
- All string values MUST use double quotes.
- No trailing commas before } or ].
- Never use undefined, NaN, or Infinity — use null or 0 instead.
- Produce valid RFC 8259 JSON only.`

const ELEMENT_SPEC = `Required fields for EVERY element:
- id: unique 6-char alphanumeric string
- type: "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "text" | "freedraw"
- x, y: position numbers
- width, height: size numbers
- angle: 0
- strokeColor: "#1e1e1e"
- backgroundColor: "transparent" or a hex color like "#e8f4fd"
- fillStyle: "hachure" | "solid" | "cross-hatch"
- strokeWidth: 2
- strokeStyle: "solid" | "dashed" | "dotted"
- roughness: 1
- opacity: 100
- groupIds: []
- frameId: null
- roundness: null  (or {"type": 3} for rounded rectangles)
- boundElements: []
- updated: 1
- link: null
- locked: false

For "text" elements, also add:
- text: "the string"
- fontSize: 20
- fontFamily: 1
- textAlign: "center"
- verticalAlign: "middle"
- containerId: null
- originalText: "same as text"
- lineHeight: 1.25

For "arrow" or "line" elements, also add:
- points: [[0,0],[100,0]]
- lastCommittedPoint: null
- startBinding: null
- endBinding: null
- startArrowhead: null
- endArrowhead: "arrow" (for arrows) or null (for lines)

Layout tips:
- Start at x:100, y:100. Leave 40-60px spacing between elements.
- Rectangles: 160x60 for boxes, 120x60 for small boxes.
- Flowcharts: top-to-bottom with arrows. Mind maps: radiate from center.
- Text elements should be slightly inside their container boxes.
- Use backgroundColor on shapes for visual clarity.`

// ─── System prompts ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Excalidraw diagram creator.
Respond with ONLY a valid JSON array of Excalidraw elements. Start with [ and end with ].

${JSON_RULES}

${ELEMENT_SPEC}`

const SLIDE_SYSTEM_PROMPT = `You are creating one slide in a series of Excalidraw diagrams.
Respond with ONLY a JSON object: {"title":"Short title","elements":[...]}

${JSON_RULES}

${ELEMENT_SPEC}

Keep each slide SIMPLE: 4-8 elements max. One clear idea per slide.`

// ─── JSON repair helpers ──────────────────────────────────────────────────────

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
}

function applyFixes(text: string): string {
  return text
    // Remove single-line JS comments
    .replace(/\/\/[^\n]*/g, '')
    // Fix trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix single-quoted property names:  {'key':  →  "key":
    .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
    // Fix unquoted property names:  {key:  →  {"key":
    // (excludes :: and :// so we don't mangle URLs or type annotations)
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:(?!\s*[:\/]))/g, '$1"$2"$3')
    // Replace JS-only values
    .replace(/:\s*undefined\b/g, ': null')
    .replace(/:\s*NaN\b/g, ': 0')
    .replace(/:\s*Infinity\b/g, ': 999999')
}

function tryParse(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

function robustParse(raw: string): unknown {
  const text = stripFences(raw)

  // Attempt 1: direct parse
  const r1 = tryParse(text)
  if (r1 !== null) return r1

  // Attempt 2: apply all fixes then parse
  const r2 = tryParse(applyFixes(text))
  if (r2 !== null) return r2

  // Attempt 3: extract the first [...] or {...} block
  const block = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
  if (block) {
    const r3 = tryParse(block[0])
    if (r3 !== null) return r3

    const r4 = tryParse(applyFixes(block[0]))
    if (r4 !== null) return r4
  }

  return null
}

function freshIds(elements: object[]): object[] {
  return elements.map((el) => ({ ...(el as object), id: nanoid(8), updated: Date.now(), locked: false }))
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateDiagram(prompt: string, apiKey: string): Promise<object[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  let response
  try {
    response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`API error: ${msg}`)
  }

  const text = response.content.find((b) => b.type === 'text')?.text ?? '[]'
  const parsed = robustParse(text)

  // Model sometimes returns {elements:[...]} instead of bare [...] — handle both
  const rawEls = Array.isArray(parsed)
    ? (parsed as object[])
    : Array.isArray((parsed as Record<string, unknown>)?.elements)
      ? ((parsed as Record<string, unknown>).elements as object[])
      : null

  if (!rawEls) {
    throw new Error('Could not parse the diagram response. Please try rephrasing your prompt.')
  }

  return freshIds(rawEls)
}

// ─── Series generation ────────────────────────────────────────────────────────

export interface SlideResult {
  title: string
  elements: object[]
}

export async function generateSeries(
  prompt: string,
  count: number,
  apiKey: string,
  onProgress?: (current: number, total: number, title: string) => void
): Promise<SlideResult[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const results: SlideResult[] = []

  for (let i = 0; i < count; i++) {
    const prevContext = results.length > 0
      ? `\nPrevious slides: ${results.map((r, j) => `Slide ${j + 1}: "${r.title}"`).join(', ')}. Continue the narrative naturally.`
      : '\nThis is the opening slide — provide an overview.'

    const userMsg =
      `Create slide ${i + 1} of ${count} in a series about: "${prompt}"${prevContext}

Respond ONLY with: {"title":"Short title (2-5 words)","elements":[...]}`

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: SLIDE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text ?? '{}'
    const parsed = robustParse(text) as { title?: string; elements?: object[] } | null

    const title = parsed?.title ?? `Slide ${i + 1}`
    // elements may be in parsed.elements (object format) or parsed itself (array fallback)
    const rawEls = parsed?.elements ?? (Array.isArray(parsed) ? (parsed as object[]) : [])
    const elements = freshIds(rawEls as object[])

    onProgress?.(i + 1, count, title)
    results.push({ title, elements })
  }

  return results
}
