import { z } from "zod"
import { router, requireRole } from "@/lib/trpc/server"
import { withTenant, aiQuoteJobs, quotes, leads, mediaAssets } from "@buildos/db"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

// AI photo-to-quote pipeline
// Phase 1: synchronous (< 30s) — suitable for small photo batches
// Phase 2+: promote to BullMQ async job for larger sets

export const aiRouter = router({
  generateQuote: requireRole("field")
    .input(
      z.object({
        leadId: z.string().uuid(),
        photoUrls: z.array(z.string().url()).min(1).max(10),
        additionalContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        // Verify lead belongs to tenant (RLS handles this, but explicit check for clarity)
        const [lead] = await tx
          .select()
          .from(leads)
          .where(eq(leads.id, input.leadId))
          .limit(1)

        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" })

        // Create job record
        const [job] = await tx
          .insert(aiQuoteJobs)
          .values({
            tenantId: ctx.tenantId,
            leadId: input.leadId,
            photoUrls: input.photoUrls,
            status: "processing",
          })
          .returning()

        try {
          // Build vision prompt with photo URLs
          const imageBlocks: Anthropic.ImageBlockParam[] = input.photoUrls.map((url) => ({
            type: "image",
            source: { type: "url", url },
          }))

          const systemPrompt = `You are an expert construction and renovation estimator with 20+ years of experience in the GTA market.
Analyze the provided photos and generate a detailed, accurate quote.

Return a JSON object with this exact structure:
{
  "scopeSummary": "brief description of work visible",
  "projectType": "renovation|basement|addition|new_build|windows|landscaping|asphalt|concrete|moving|other",
  "lineItems": [
    {
      "description": "line item description",
      "quantity": 1,
      "unit": "sq ft|lf|hr|each|ls",
      "unitPrice": 0,
      "total": 0
    }
  ],
  "subtotal": 0,
  "taxRate": 0.13,
  "tax": 0,
  "total": 0,
  "notes": "any caveats or assumptions",
  "confidenceLevel": "low|medium|high",
  "flaggedIssues": ["any structural or site concerns noted"]
}

All monetary values are in CAD cents (integer). Be conservative on pricing — GTA market rates 2024.`

          const response = await client.messages.create({
            model: "claude-opus-5",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: [
                  ...imageBlocks,
                  {
                    type: "text",
                    text:
                      `Please analyze these ${input.photoUrls.length} photo(s) and generate a detailed construction quote.\n` +
                      (input.additionalContext
                        ? `Additional context from customer: ${input.additionalContext}`
                        : ""),
                  },
                ],
              },
            ],
          })

          const rawText =
            response.content[0].type === "text" ? response.content[0].text : ""

          // Parse JSON from response (Claude returns structured JSON per prompt)
          const jsonMatch = rawText.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error("No JSON in AI response")
          const parsed = JSON.parse(jsonMatch[0])

          // Create draft quote from AI output
          const [draftQuote] = await tx
            .insert(quotes)
            .values({
              tenantId: ctx.tenantId,
              leadId: input.leadId,
              contactId: lead.contactId,
              title: `AI Quote — ${parsed.scopeSummary ?? "Renovation"}`,
              lineItems: parsed.lineItems ?? [],
              subtotal: parsed.subtotal ?? 0,
              tax: parsed.tax ?? 0,
              total: parsed.total ?? 0,
              notes: parsed.notes ?? null,
              aiGenerated: true,
              status: "draft",
            })
            .returning()

          // Mark job complete
          await tx
            .update(aiQuoteJobs)
            .set({
              status: "complete",
              rawVisionOutput: parsed,
              draftQuoteId: draftQuote.id,
              completedAt: new Date(),
            })
            .where(eq(aiQuoteJobs.id, job.id))

          return {
            jobId: job.id,
            quoteId: draftQuote.id,
            scopeSummary: parsed.scopeSummary,
            total: parsed.total,
            confidenceLevel: parsed.confidenceLevel,
            flaggedIssues: parsed.flaggedIssues ?? [],
          }
        } catch (err) {
          await tx
            .update(aiQuoteJobs)
            .set({
              status: "failed",
              error: err instanceof Error ? err.message : "Unknown error",
              completedAt: new Date(),
            })
            .where(eq(aiQuoteJobs.id, job.id))

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "AI quote generation failed",
          })
        }
      })
    }),

  generateCaption: requireRole("field")
    .input(
      z.object({
        photoUrl: z.string().url(),
        type: z.enum(["before", "after", "progress"]),
        projectType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prompt =
        input.type === "after"
          ? `You are writing marketing copy for a renovation company. Write a compelling, professional 2-sentence caption for this AFTER photo of a ${input.projectType ?? "renovation"} project. Highlight the transformation. Keep it warm, confident, and client-facing.`
          : `Write a brief, professional caption for this ${input.type} photo of a ${input.projectType ?? "renovation"} project. One sentence.`

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: input.photoUrl } },
              { type: "text", text: prompt },
            ],
          },
        ],
      })

      const caption =
        response.content[0].type === "text" ? response.content[0].text.trim() : ""
      return { caption }
    }),
})
