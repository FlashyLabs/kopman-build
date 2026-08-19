/**
 * Video-to-Quote Pipeline — Phase 5
 *
 * Flow:
 * 1. Client uploads video to R2 (presigned URL)
 * 2. Frame extractor job runs (ffmpeg via Lambda / Railway job)
 * 3. Extracted frames sent to Claude Vision in parallel
 * 4. Results merged → structured quote draft
 *
 * Frame extraction runs server-side via a lightweight job worker.
 * In Phase 5 this is a Railway background service; Phase 6 migrates to AWS Batch.
 */

import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

export interface VideoQuoteJob {
  jobId: string
  leadId: string
  tenantId: string
  videoUrl: string
  status: "pending" | "extracting" | "analyzing" | "complete" | "failed"
}

export interface ExtractedFrame {
  url: string
  timestampSeconds: number
  label: string  // "start" | "middle" | "end" | auto-labeled
}

export interface VideoQuoteResult {
  scopeSummary: string
  projectType: string
  roomsIdentified: string[]
  conditionNotes: string[]
  lineItems: Array<{
    description: string
    quantity: number
    unit: string
    unitPrice: number   // cents
    total: number       // cents
    confidence: "high" | "medium" | "low"
  }>
  subtotal: number
  tax: number
  total: number
  flaggedIssues: string[]
  confidenceLevel: "high" | "medium" | "low"
  recommendedFollowUp: string
  notes: string
}

// Analyze a set of extracted frames from a video walkthrough
export async function analyzeVideoFrames(
  frames: ExtractedFrame[],
  context: {
    projectType?: string
    address?: string
    additionalNotes?: string
  }
): Promise<VideoQuoteResult> {
  if (frames.length === 0) throw new Error("No frames to analyze")

  // Cap at 20 frames to stay within context limits — caller should pre-select keyframes
  const selectedFrames = frames.slice(0, 20)

  const imageBlocks: Anthropic.ImageBlockParam[] = selectedFrames.map((f) => ({
    type: "image",
    source: { type: "url", url: f.url },
  }))

  const frameDescriptions = selectedFrames
    .map((f, i) => `Frame ${i + 1} [${f.timestampSeconds}s — ${f.label}]`)
    .join(", ")

  const systemPrompt = `You are a senior renovation estimator with 20+ years of GTA market experience.
You are analyzing frames extracted from a homeowner's video walkthrough of their property.

Your job is to:
1. Identify every room and area shown
2. Assess condition and scope of work needed
3. Generate a detailed, itemized quote
4. Flag any structural concerns, permits required, or items needing in-person verification

Return ONLY a JSON object with this structure:
{
  "scopeSummary": "2-3 sentence executive summary of all work visible",
  "projectType": "renovation|basement|addition|new_build|windows|landscaping|asphalt|concrete|moving|other",
  "roomsIdentified": ["list of rooms/areas shown in video"],
  "conditionNotes": ["specific condition observations per area"],
  "lineItems": [
    {
      "description": "specific line item",
      "quantity": 1,
      "unit": "sq ft|lf|hr|each|ls|room",
      "unitPrice": 0,
      "total": 0,
      "confidence": "high|medium|low"
    }
  ],
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "flaggedIssues": ["items needing in-person verification or permit"],
  "confidenceLevel": "high|medium|low",
  "recommendedFollowUp": "specific action item for sales team",
  "notes": "any assumptions or caveats"
}

All monetary values in CAD cents. GTA 2024 labour + material rates.
Mark line items as low confidence if visibility was obscured in the video.`

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: [
              `Analyze these ${selectedFrames.length} frames extracted from a property walkthrough video.`,
              `Frames: ${frameDescriptions}`,
              context.projectType ? `Project type: ${context.projectType}` : "",
              context.address ? `Property: ${context.address}` : "",
              context.additionalNotes ? `Customer notes: ${context.additionalNotes}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const json = text.match(/\{[\s\S]*\}/)
  if (!json) throw new Error("No JSON returned from video analysis")

  return JSON.parse(json[0]) as VideoQuoteResult
}

// Generate a frame extraction job payload for the worker service
export function buildFrameExtractionJob(opts: {
  jobId: string
  videoUrl: string
  targetFrameCount: number   // 8-20 recommended
  strategy: "uniform" | "keyframe" | "scene-change"
}): object {
  return {
    jobId: opts.jobId,
    videoUrl: opts.videoUrl,
    targetFrameCount: opts.targetFrameCount,
    strategy: opts.strategy,
    outputBucket: process.env.R2_BUCKET_NAME,
    outputPrefix: `frames/${opts.jobId}/`,
    webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/frame-extraction`,
  }
}
