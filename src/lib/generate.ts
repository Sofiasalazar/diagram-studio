import Anthropic from '@anthropic-ai/sdk'
import { convertToExcalidrawElements } from '@excalidraw/excalidraw'

// ─── System prompt (MCP-style simplified format) ─────────────────────────────

const SYSTEM_PROMPT = `You are an expert diagram creator using Excalidraw's simplified element format.

RESPOND WITH ONLY A JSON ARRAY. No markdown, no code fences, no explanation.

## Element Format

Required fields for ALL elements: type, id (unique string), x, y, width, height

### Shapes (rectangle, ellipse, diamond)
Use \`label\` for auto-centered text inside shapes — no separate text elements needed.
\`{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 80, "backgroundColor": "#a5d8ff", "fillStyle": "solid", "roundness": { "type": 3 }, "label": { "text": "My Label", "fontSize": 18 } }\`

### Standalone text (titles only)
\`{ "type": "text", "id": "t1", "x": 150, "y": 20, "text": "Title Here", "fontSize": 24 }\`
To center: x = centerX - (text.length * fontSize * 0.5) / 2

### Arrows
\`{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0, "points": [[0,0],[200,0]], "endArrowhead": "arrow" }\`
For labeled arrows: add \`"label": { "text": "connects" }\`
Arrow bindings: \`"startBinding": { "elementId": "r1", "fixedPoint": [1, 0.5] }\`
fixedPoint: top=[0.5,0], bottom=[0.5,1], left=[0,0.5], right=[1,0.5]

### Camera (REQUIRED as FIRST element)
Controls viewport framing. Must be 4:3 ratio. Make the camera 30-50% LARGER than your content to ensure nothing is clipped.
\`{ "type": "cameraUpdate", "width": 800, "height": 600, "x": 0, "y": 0 }\`
Sizes: 600x450 (small), 800x600 (medium/DEFAULT), 1200x900 (large diagrams)
x,y = top-left corner of visible area. If content starts at x:50,y:20 and is 700px wide by 500px tall, use: x:-50, y:-30, width:1000, height:750

## Color Palette

### Shape fills (pastels)
- Light Blue #a5d8ff — inputs, sources
- Light Green #b2f2bb — success, output
- Light Orange #ffd8a8 — warning, external
- Light Purple #d0bfff — processing, special
- Light Red #ffc9c9 — errors, critical
- Light Yellow #fff3bf — decisions, notes
- Light Teal #c3fae8 — storage, data

### Stroke colors
- Default: #1e1e1e
- Blue: #4a9eed, Green: #22c55e, Purple: #8b5cf6, Orange: #f59e0b, Red: #ef4444

### Background zones (use opacity: 30)
- Blue zone #dbe4ff, Purple zone #e5dbff, Green zone #d3f9d8

## Rules
- ALWAYS start with cameraUpdate as the FIRST element
- Use label property on shapes — NEVER create separate text elements for shape labels
- Minimum shape size: 120x60 for labeled shapes
- Minimum fontSize: 16 for labels, 20 for titles
- Leave 20-30px gaps between elements
- 8-15 elements total for clarity
- Emit progressively: background zone → shape + arrows → next shape
- Keep text short (under 30 characters per label)

## Example: Two connected boxes
\`\`\`json
[
  { "type": "cameraUpdate", "width": 800, "height": 600, "x": 50, "y": 50 },
  { "type": "text", "id": "t1", "x": 220, "y": 60, "text": "Simple Flow", "fontSize": 24 },
  { "type": "rectangle", "id": "b1", "x": 100, "y": 120, "width": 200, "height": 80, "roundness": { "type": 3 }, "backgroundColor": "#a5d8ff", "fillStyle": "solid", "label": { "text": "Start", "fontSize": 20 } },
  { "type": "arrow", "id": "a1", "x": 300, "y": 160, "width": 150, "height": 0, "points": [[0,0],[150,0]], "endArrowhead": "arrow", "startBinding": { "elementId": "b1", "fixedPoint": [1, 0.5] }, "endBinding": { "elementId": "b2", "fixedPoint": [0, 0.5] } },
  { "type": "rectangle", "id": "b2", "x": 450, "y": 120, "width": 200, "height": 80, "roundness": { "type": 3 }, "backgroundColor": "#b2f2bb", "fillStyle": "solid", "label": { "text": "End", "fontSize": 20 } }
]
\`\`\``

const SLIDE_SYSTEM_PROMPT = `You are creating one slide in a series of Excalidraw diagrams.

Respond with ONLY a JSON object: {"title":"Short title","elements":[...]}

${SYSTEM_PROMPT.split('## Example')[0]}

For slides: 6-10 elements per slide. One concept per slide. Include a cameraUpdate (600x450) as the first element.`

// ─── JSON repair helpers ──────────────────────────────────────────────────────

function stripFences(text: string): string {
  let cleaned = text.replace(/```(?:json|JSON)?\s*\n?/g, '').trim()
  const firstBracket = cleaned.search(/[\[{]/)
  const lastBracket = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'))
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1)
  }
  return cleaned
}

function applyFixes(text: string): string {
  return text
    .replace(/\/\/[^\n]*/g, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:(?!\s*[:/]))/g, '$1"$2"$3')
    .replace(/:\s*undefined\b/g, ': null')
    .replace(/:\s*NaN\b/g, ': 0')
    .replace(/:\s*Infinity\b/g, ': 999999')
}

function tryParse(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

function repairTruncated(text: string): string {
  const trimmed = text.trim()
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return trimmed
  }
  if (trimmed.startsWith('[')) {
    const lastCompleteObj = trimmed.lastIndexOf('},')
    const lastObj = trimmed.lastIndexOf('}')
    if (lastCompleteObj > 0) return trimmed.slice(0, lastCompleteObj + 1) + ']'
    if (lastObj > 0) return trimmed.slice(0, lastObj + 1) + ']'
  }
  return trimmed
}

function robustParse(raw: string): unknown {
  const text = stripFences(raw)
  const r1 = tryParse(text)
  if (r1 !== null) return r1
  const r2 = tryParse(applyFixes(text))
  if (r2 !== null) return r2
  const repaired = repairTruncated(applyFixes(text))
  const r3 = tryParse(repaired)
  if (r3 !== null) return r3
  const block = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
  if (block) {
    const r4 = tryParse(block[0])
    if (r4 !== null) return r4
    const r5 = tryParse(applyFixes(block[0]))
    if (r5 !== null) return r5
  }
  return null
}

// ─── Element processing ──────────────────────────────────────────────────────

interface CameraUpdate {
  x: number
  y: number
  width: number
  height: number
}

function processElements(rawElements: object[]): {
  elements: object[]
  camera: CameraUpdate | null
} {
  // Extract cameraUpdate pseudo-elements
  let camera: CameraUpdate | null = null
  const drawElements: object[] = []

  for (const el of rawElements) {
    const e = el as Record<string, unknown>
    // Ensure text is visible
    if (e.type === 'text') {
      const sc = e.strokeColor as string | undefined
      if (!sc || sc === 'transparent') {
        e.strokeColor = '#1e1e1e'
      }
    }
    if (e.type === 'cameraUpdate') {
      camera = {
        x: (e.x as number) || 0,
        y: (e.y as number) || 0,
        width: (e.width as number) || 800,
        height: (e.height as number) || 600,
      }
    } else if (e.type === 'delete') {
      // Skip delete pseudo-elements
    } else {
      drawElements.push(e)
    }
  }

  // Convert simplified elements to proper Excalidraw elements
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const converted = convertToExcalidrawElements(drawElements as any, { regenerateIds: true })
    return { elements: converted, camera }
  } catch (err) {
    console.warn('[DiagramStudio] convertToExcalidrawElements failed, using raw elements:', err)
    return { elements: drawElements, camera }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GenerateUsage {
  input_tokens: number
  output_tokens: number
}

export interface DiagramResult {
  elements: object[]
  camera: CameraUpdate | null
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`API error: ${msg}`)
  }

  const text = response.content.find((b) => b.type === 'text')?.text ?? ''
  if (!text) throw new Error('API returned no text content.')

  const parsed = robustParse(text)

  // Extract elements array
  let rawEls: object[] | null = null
  if (Array.isArray(parsed)) {
    rawEls = parsed as object[]
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    for (const key of ['elements', 'diagram']) {
      if (Array.isArray(obj[key])) { rawEls = obj[key] as object[]; break }
    }
    if (!rawEls) {
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
          rawEls = obj[key] as object[]
          break
        }
      }
    }
  }

  if (!rawEls) {
    throw new Error('Could not parse diagram. Try a simpler prompt.')
  }

  const { elements, camera } = processElements(rawEls)

  return {
    elements,
    camera,
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
      ? `\nPrevious slides: ${slides.map((r, j) => `Slide ${j + 1}: "${r.title}"`).join(', ')}. Continue the narrative.`
      : '\nThis is the opening slide.'

    const userMsg = `Create slide ${i + 1} of ${count} about: "${prompt}"${prevContext}\nRespond ONLY with: {"title":"...","elements":[...]}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: SLIDE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    })

    totalUsage.input_tokens += response.usage.input_tokens
    totalUsage.output_tokens += response.usage.output_tokens

    const text = response.content.find((b) => b.type === 'text')?.text ?? '{}'
    const parsed = robustParse(text) as { title?: string; elements?: object[] } | null

    const title = parsed?.title ?? `Slide ${i + 1}`
    const rawEls = parsed?.elements ?? (Array.isArray(parsed) ? (parsed as object[]) : [])
    const { elements } = processElements(rawEls as object[])

    onProgress?.(i + 1, count, title)
    slides.push({ title, elements })
  }

  return { slides, usage: totalUsage }
}
