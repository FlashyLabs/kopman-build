/**
 * Content Machine — Case Study Generator
 *
 * Given a completed project with published before/after media, generates:
 * 1. A structured case study (title, overview, scope, outcome)
 * 2. An FAQ entry for the Kopman Build website
 * 3. Social post copy (Instagram + Facebook)
 * 4. A Google Business post snippet
 *
 * In Phase 2 this runs as a BullMQ job triggered after media.publish().
 * The output is stored in content_pieces table (added in Phase 2 migration).
 */

import Anthropic from "@anthropic-ai/sdk"
import { withTenant, projects, contacts, mediaAssets, db } from "@buildos/db"
import { eq, and } from "drizzle-orm"

const anthropic = new Anthropic()

export interface CaseStudyOutput {
  title: string
  slug: string
  neighbourhood: string
  projectType: string
  overview: string          // 2-3 sentences
  scopePoints: string[]     // 4-6 bullet points
  outcome: string           // 1-2 sentences, quantified where possible
  testimonialPrompt: string // email snippet to request review from customer
  faqEntry: {
    question: string
    answer: string
  }
  socialPosts: {
    instagram: string       // caption + hashtags
    facebook: string        // slightly longer, more narrative
    google: string          // 150-word Google Business post
  }
  seoMetaTitle: string      // <60 chars
  seoMetaDescription: string // <160 chars
}

export async function generateCaseStudy(
  tenantId: string,
  projectId: string
): Promise<CaseStudyOutput> {
  // Load project + contact + published media
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) throw new Error(`Project ${projectId} not found`)

  const [contact] = project.contactId
    ? await db
        .select({ firstName: contacts.firstName, city: contacts.city })
        .from(contacts)
        .where(eq(contacts.id, project.contactId))
        .limit(1)
    : []

  const publishedMedia = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.projectId, projectId),
        eq(mediaAssets.publishedToSite, true)
      )
    )

  const beforePhotos = publishedMedia.filter((m) => m.type === "before")
  const afterPhotos = publishedMedia.filter((m) => m.type === "after")

  // Build vision content array
  const imageBlocks: Anthropic.ImageBlockParam[] = [
    ...beforePhotos.slice(0, 3).map((m) => ({
      type: "image" as const,
      source: { type: "url" as const, url: m.url },
    })),
    ...afterPhotos.slice(0, 3).map((m) => ({
      type: "image" as const,
      source: { type: "url" as const, url: m.url },
    })),
  ]

  const hasPhotos = imageBlocks.length > 0

  const systemPrompt = `You are a senior content strategist for Kopman Build, a premium renovation company in the GTA.
Your writing is confident, specific, and client-facing. Avoid generic phrases like "dream home" or "quality craftsmanship".
Be concrete: mention materials, timelines, neighbourhoods, and measurable outcomes where possible.

Return a JSON object with this exact structure:
{
  "title": "string — specific project title e.g. 'Full Basement Conversion — Leslieville Semi-Detached'",
  "slug": "url-slug",
  "neighbourhood": "Toronto neighbourhood or city",
  "projectType": "e.g. Basement Renovation",
  "overview": "2-3 sentence overview of the project",
  "scopePoints": ["4-6 specific scope bullets"],
  "outcome": "1-2 sentences on result, quantified where visible",
  "testimonialPrompt": "Short friendly email body to request a Google review from the homeowner",
  "faqEntry": {
    "question": "A question this project answers e.g. 'How long does a basement renovation take in Toronto?'",
    "answer": "Specific 2-3 sentence answer using this project as example"
  },
  "socialPosts": {
    "instagram": "Caption + 8-10 relevant hashtags, max 300 chars before hashtags",
    "facebook": "150-200 word narrative post, warmer tone, no hashtags",
    "google": "150-word Google Business post announcing the project completion"
  },
  "seoMetaTitle": "Under 60 chars",
  "seoMetaDescription": "Under 160 chars"
}`

  const contextText = `
Project type: ${project.type}
Address: ${project.address}
City/neighbourhood: ${contact?.city ?? "Toronto"}
Contract value: $${Math.round((project.contractValue ?? 0) / 100).toLocaleString("en-CA")}
Status: ${project.status}
${project.notes ? `Project notes: ${project.notes}` : ""}
Published media: ${beforePhotos.length} before photo(s), ${afterPhotos.length} after photo(s)
Existing captions: ${publishedMedia
    .filter((m) => m.aiCaption)
    .map((m) => `[${m.type}] ${m.aiCaption}`)
    .join(" | ")}
`.trim()

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          ...(hasPhotos ? imageBlocks : []),
          {
            type: "text",
            text: `Generate a full content package for this completed renovation project.\n\n${contextText}`,
          },
        ],
      },
    ],
  })

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON returned from case study generator")

  return JSON.parse(jsonMatch[0]) as CaseStudyOutput
}
