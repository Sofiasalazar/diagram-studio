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

const ELEMENT_SPEC = `IMPORTANT: Generate between 15 and 25 elements total. Create a RICH, DETAILED diagram with shapes, labels, connecting arrows, and section titles. Text values up to 60 characters.

COLOR PALETTE — use these for backgroundColor to create visual zones:
- Headers/titles: "#1e1b4b" (dark indigo) with strokeColor "#4f46e5"
- Primary boxes: "#ede9fe" with strokeColor "#7c3aed"
- Secondary boxes: "#f0fdf4" with strokeColor "#16a34a"
- Accent boxes: "#fff7ed" with strokeColor "#ea580c"
- Neutral/gray boxes: "#1c1917" with strokeColor "#44403c"
- Decision diamonds: "#fefce8" with strokeColor "#ca8a04"
- Arrows/lines: strokeColor "#6b7280", backgroundColor "transparent"
- Text-only elements: backgroundColor "transparent", strokeColor "transparent"

Required fields for EVERY element:
- id: unique 8-char alphanumeric string
- type: "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "text"
- x, y: position numbers (integers)
- width, height: size numbers (integers)
- angle: 0
- strokeColor: a hex color string
- backgroundColor: "transparent" or a hex color
- fillStyle: "solid"
- strokeWidth: 2
- strokeStyle: "solid" | "dashed"
- roughness: 0
- opacity: 100
- groupIds: []
- frameId: null
- roundness: null (or {"type": 3} for rounded rectangles/ellipses)
- boundElements: []
- updated: 1
- link: null
- locked: false

For "text" elements, also add:
- text: "the string"
- fontSize: 16 (use 20 for titles, 14 for small labels)
- fontFamily: 1
- textAlign: "center"
- verticalAlign: "middle"
- containerId: null
- originalText: "same as text"
- lineHeight: 1.25

For "arrow" or "line" elements, also add:
- points: [[0,0],[dx,dy]] where dx/dy describe the direction and length
- lastCommittedPoint: null
- startBinding: null
- endBinding: null
- startArrowhead: null
- endArrowhead: "arrow" (for arrows) or null (for lines)

LAYOUT STRATEGY — adapt to diagram type:
- Flowcharts: top-to-bottom, nodes every 120px vertically. Start at x:200, y:80.
- Architecture: layered zones, each zone a large background rectangle + inner boxes. x:50 to x:1100.
- ERD/Schema: left-to-right tables, each table column 220px wide. Relationships as horizontal arrows.
- Mind map: center hub ellipse at x:550,y:400, branches radiate out 250px in all directions.
- Timeline: horizontal, milestones every 200px along y:300. Start at x:80.
- Org chart: top-down hierarchy, each level 120px below previous, siblings 200px apart.

COMPOSITION RULES:
- Add a title text element at the top (fontSize:24, y:20).
- Use large background rectangles (low opacity look: fillStyle "solid") to group related items into zones.
- Connect all process steps with arrow elements.
- Add short label text elements INSIDE or NEXT to every shape.
- Use color coding consistently — same color = same logical group.
- Minimum 5 arrows for any flow diagram. Minimum 3 zones/groups for architecture.`

// ─── System prompts ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Excalidraw diagram creator. Your diagrams are professional, richly detailed, and visually clear.

Think step by step:
1. Identify the diagram type from the prompt (flowchart, architecture, ERD, mind map, timeline, org chart, etc.)
2. Plan the layout and color zones
3. List all elements needed (shapes, labels, arrows, section titles)
4. Output the JSON array

Respond with ONLY a valid JSON array of Excalidraw elements. Start with [ and end with ].

${JSON_RULES}

${ELEMENT_SPEC}`

const SLIDE_SYSTEM_PROMPT = `You are creating one slide in a series of Excalidraw diagrams. Each slide is professional, colorful, and easy to read.

Respond with ONLY a JSON object: {"title":"Short title (2-5 words)","elements":[...]}

${JSON_RULES}

${ELEMENT_SPEC}

For slides: 8-12 elements per slide. One clear concept per slide. Use a large title text element at top (fontSize:22). Use color zones to visually separate sections.`

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

export interface GenerateUsage {
  input_tokens: number
  output_tokens: number
}

export interface DiagramResult {
  elements: object[]
  usage: GenerateUsage
}

export interface SeriesResult {
  slides: SlideResult[]
  usage: GenerateUsage
}

export async function generateDiagram(prompt: string, apiKey: string): Promise<DiagramResult> {
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

  return {
    elements: freshIds(rawEls),
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
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
): Promise<SeriesResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const slides: SlideResult[] = []
  const totalUsage: GenerateUsage = { input_tokens: 0, output_tokens: 0 }

  for (let i = 0; i < count; i++) {
    const prevContext = slides.length > 0
      ? `\nPrevious slides: ${slides.map((r, j) => `Slide ${j + 1}: "${r.title}"`).join(', ')}. Continue the narrative naturally.`
      : '\nThis is the opening slide — provide an overview.'

    const userMsg =
      `Create slide ${i + 1} of ${count} in a series about: "${prompt}"${prevContext}

Respond ONLY with: {"title":"Short title (2-5 words)","elements":[...]}`

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      system: SLIDE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    })

    totalUsage.input_tokens += response.usage.input_tokens
    totalUsage.output_tokens += response.usage.output_tokens

    const text = response.content.find((b) => b.type === 'text')?.text ?? '{}'
    const parsed = robustParse(text) as { title?: string; elements?: object[] } | null

    const title = parsed?.title ?? `Slide ${i + 1}`
    // elements may be in parsed.elements (object format) or parsed itself (array fallback)
    const rawEls = parsed?.elements ?? (Array.isArray(parsed) ? (parsed as object[]) : [])
    const elements = freshIds(rawEls as object[])

    onProgress?.(i + 1, count, title)
    slides.push({ title, elements })
  }

  return { slides, usage: totalUsage }
}
