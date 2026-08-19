import { z } from "zod"
import { router, requireRole, protectedProcedure } from "@/lib/trpc/server"
import { withTenant, quotes, leads } from "@buildos/db"
import { videoQuoteJobs } from "@buildos/db/src/schema-phase5"
import { eq, desc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import {
  analyzeVideoFrames,
  buildFrameExtractionJob,
  type ExtractedFrame,
} from "@/server/ai/video-pipeline"
import { assertAiQuoteLimit } from "@/server/billing/plan-gate"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const videoQuotesRouter = router({
  // Step 1: Get presigned upload URL for the video file
  getVideoUploadUrl: requireRole("field")
    .input(
      z.object({
        leadId: z.string().uuid(),
        filename: z.string(),
        mimeType: z.string().regex(/^video\//),
        sizeBytes: z.number().int().positive().max(500 * 1024 * 1024),  // 500MB cap
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertAiQuoteLimit(ctx.tenantId)

      const key = `${ctx.tenantId}/videos/${input.leadId}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`

      const presigned = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
          ContentType: input.mimeType,
          ContentLength: input.sizeBytes,
        }),
        { expiresIn: 900 }  // 15 min — videos are large
      )

      const videoUrl = `${process.env.R2_PUBLIC_URL}/${key}`

      // Create job record immediately
      const [job] = await withTenant(ctx.tenantId, async (tx) => {
        return tx
          .insert(videoQuoteJobs)
          .values({
            tenantId: ctx.tenantId,
            leadId: input.leadId,
            videoUrl,
            status: "uploading",
          })
          .returning()
      })

      return { uploadUrl: presigned, videoUrl, jobId: job.id }
    }),

  // Step 2: Called by client after upload completes — kicks off frame extraction
  startProcessing: requireRole("field")
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(videoQuoteJobs)
          .where(eq(videoQuoteJobs.id, input.jobId))
          .limit(1)
      })

      if (!job) throw new TRPCError({ code: "NOT_FOUND" })
      if (job.status !== "uploading") {
        throw new TRPCError({ code: "CONFLICT", message: "Job already started" })
      }

      // Build extraction job payload for the worker service
      const workerPayload = buildFrameExtractionJob({
        jobId: job.id,
        videoUrl: job.videoUrl,
        targetFrameCount: 16,
        strategy: "scene-change",
      })

      // Dispatch to frame extraction worker
      // Phase 5: Railway background service via HTTP trigger
      // Phase 6: AWS Batch job
      let workerJobId: string | null = null
      if (process.env.FRAME_WORKER_URL) {
        const res = await fetch(process.env.FRAME_WORKER_URL + "/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.FRAME_WORKER_SECRET}`,
          },
          body: JSON.stringify(workerPayload),
        })
        const data = await res.json() as { jobId?: string }
        workerJobId = data.jobId ?? null
      }

      await withTenant(ctx.tenantId, async (tx) => {
        return tx
          .update(videoQuoteJobs)
          .set({ status: "extracting", workerJobId })
          .where(eq(videoQuoteJobs.id, input.jobId))
      })

      return { jobId: job.id, status: "extracting" }
    }),

  // Webhook: frame extraction worker calls this when frames are ready
  // Then runs vision analysis synchronously (frames are small)
  onFramesReady: requireRole("owner")   // internal — called by worker with service token
    .input(
      z.object({
        jobId: z.string().uuid(),
        frames: z.array(
          z.object({
            url: z.string().url(),
            timestampSeconds: z.number(),
            label: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [job] = await withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(videoQuoteJobs)
          .where(eq(videoQuoteJobs.id, input.jobId))
          .limit(1)
      })

      if (!job) throw new TRPCError({ code: "NOT_FOUND" })

      // Update frame URLs
      await withTenant(ctx.tenantId, async (tx) => {
        return tx
          .update(videoQuoteJobs)
          .set({
            status: "analyzing",
            extractedFrameUrls: input.frames.map((f) => f.url),
            frameCount: input.frames.length,
          })
          .where(eq(videoQuoteJobs.id, input.jobId))
      })

      try {
        // Run vision analysis
        const result = await analyzeVideoFrames(input.frames as ExtractedFrame[], {
          projectType: undefined,
          additionalNotes: undefined,
        })

        // Create draft quote
        const [draftQuote] = await withTenant(ctx.tenantId, async (tx) => {
          return tx
            .insert(quotes)
            .values({
              tenantId: ctx.tenantId,
              leadId: job.leadId,
              title: `Video Quote — ${result.scopeSummary.slice(0, 60)}`,
              lineItems: result.lineItems,
              subtotal: result.subtotal,
              tax: result.tax,
              total: result.total,
              notes: `Rooms: ${result.roomsIdentified.join(", ")}\n\nIssues flagged: ${result.flaggedIssues.join(", ") || "none"}\n\n${result.notes}`,
              aiGenerated: true,
              status: "draft",
            })
            .returning()
        })

        await withTenant(ctx.tenantId, async (tx) => {
          return tx
            .update(videoQuoteJobs)
            .set({
              status: "complete",
              rawAnalysisOutput: result,
              draftQuoteId: draftQuote.id,
              completedAt: new Date(),
            })
            .where(eq(videoQuoteJobs.id, input.jobId))
        })

        return { quoteId: draftQuote.id, total: result.total, confidence: result.confidenceLevel }
      } catch (err) {
        await withTenant(ctx.tenantId, async (tx) => {
          return tx
            .update(videoQuoteJobs)
            .set({
              status: "failed",
              error: err instanceof Error ? err.message : "Analysis failed",
              completedAt: new Date(),
            })
            .where(eq(videoQuoteJobs.id, input.jobId))
        })
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Video analysis failed" })
      }
    }),

  // Poll job status (client polls until complete/failed)
  status: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [job] = await withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(videoQuoteJobs)
          .where(eq(videoQuoteJobs.id, input.jobId))
          .limit(1)
      })

      if (!job) throw new TRPCError({ code: "NOT_FOUND" })
      return job
    }),

  // List video quote jobs for a lead
  listByLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(videoQuoteJobs)
          .where(eq(videoQuoteJobs.leadId, input.leadId))
          .orderBy(desc(videoQuoteJobs.createdAt))
      })
    }),
})
