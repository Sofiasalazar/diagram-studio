import Anthropic from '@anthropic-ai/sdk'
import { nanoid } from 'nanoid'

const SYSTEM_PROMPT = `You are an expert at creating Excalidraw diagrams. When given a description, respond with ONLY a valid JSON array of Excalidraw elements. No explanation, no markdown code fences, just the raw JSON array starting with [ and ending with ].

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
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text ?? '[]'

  // Strip any accidental markdown fences
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  const elements = JSON.parse(cleaned) as object[]

  // Ensure every element has a fresh id so it doesn't collide with existing ones
  return elements.map((el) => ({ ...el, id: nanoid(8), updated: Date.now() }))
}
