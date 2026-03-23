import Anthropic from '@anthropic-ai/sdk'
import { nanoid } from 'nanoid'

const SYSTEM_PROMPT = `You are an expert at creating Excalidraw diagrams. When given a description, respond with ONLY a valid JSON array of Excalidraw elements.

CRITICAL FORMATTING RULES:
- Output ONLY the raw JSON array. Nothing else. No explanation. No markdown. No code fences.
- The response MUST start with [ and end with ].
- ALL property names MUST use double quotes. Never use single quotes for any key or value.
- All string values MUST use double quotes.
- No trailing commas after the last item in arrays or objects.
- Produce valid RFC 8259 JSON only.

Required fields for EVERY element:
- id: unique short alphanumeric string (use nanoid-style, 6 chars)
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
- roundness: null (or {"type": 3} for rounded rectangles)
- boundElements: []
- updated: 1
- link: null
- locked: false

For "text" elements, also include:
- text: "the string"
- fontSize: 20
- fontFamily: 1
- textAlign: "center"
- verticalAlign: "middle"
- containerId: null
- originalText: "same as text"
- lineHeight: 1.25

For "arrow" or "line" elements, also include:
- points: [[0,0],[100,0]] (relative coordinates)
- lastCommittedPoint: null
- startBinding: null
- endBinding: null
- startArrowhead: null
- endArrowhead: "arrow" (for arrows) or null (for lines)

Layout tips:
- Start elements at x:100, y:100
- Leave 40-60px spacing between elements
- Use consistent sizing (rectangles: 160x60 for boxes, 120x60 for small boxes)
- For flowcharts: arrange top-to-bottom with arrows between boxes
- For mind maps: radiate outward from center
- Make text elements slightly smaller than their container boxes and center them inside
- Use backgroundColor on shapes to make diagrams visually clear`

function robustParseElements(raw: string): object[] {
  // Strip markdown fences
  let text = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  // Attempt 1: direct parse
  try {
    return JSON.parse(text) as object[]
  } catch {/* continue */}

  // Attempt 2: fix single-quoted property names  →  "key":
  const fixedQuotes = text.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
  try {
    return JSON.parse(fixedQuotes) as object[]
  } catch {/* continue */}

  // Attempt 3: extract the first [...] block from the response
  const match = text.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      return JSON.parse(match[0]) as object[]
    } catch {
      const fixedMatch = match[0].replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
      try {
        return JSON.parse(fixedMatch) as object[]
      } catch {/* fall through */}
    }
  }

  throw new Error('Could not parse diagram JSON from the AI response. Please try rephrasing your prompt.')
}

export async function generateDiagram(
  prompt: string,
  apiKey: string
): Promise<object[]> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  })

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text ?? '[]'

  const elements = robustParseElements(text)

  // Ensure every element has a fresh id so it doesn't collide with existing ones
  return elements.map((el) => ({ ...el, id: nanoid(8), updated: Date.now() }))
}
