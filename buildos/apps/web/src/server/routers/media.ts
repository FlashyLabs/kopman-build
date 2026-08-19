import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, mediaAssets, projects, contacts } from "@buildos/db"
import { eq, desc, and } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import Anthropic from "@anthropic-ai/sdk"

// Cloudflare R2 client (S3-compatible)
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME ?? "buildos-media"
const CDN_URL = process.env.R2_PUBLIC_URL ?? ""

const anthropic = new Anthropic()

export const mediaRouter = router({
  // Returns a presigned upload URL — client uploads directly to R2
  getUploadUrl: requireRole("field")
    .input(
      z.object({
        projectId: z.string().uuid().nullable().optional(),
        leadId: z.string().uuid().nullable().optional(),
        type: z.enum(["before", "after", "progress", "receipt", "document"]),
        mimeType: z.string(),
        sizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // 50MB cap
        filename: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = `${ctx.tenantId}/${input.projectId ?? input.leadId ?? "misc"}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`

      const presigned = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ContentType: input.mimeType,
          ContentLength: input.sizeBytes,
          Metadata: {
            tenantId: ctx.tenantId,
            uploadedBy: ctx.userId,
            type: input.type,
          },
        }),
        { expiresIn: 300 } // 5 min
      )

      return {
        uploadUrl: presigned,
        key,
        publicUrl: `${CDN_URL}/${key}`,
      }
    }),

  // Called after client confirms upload completed
  confirmUpload: requireRole("field")
    .input(
      z.object({
        key: z.string(),
        publicUrl: z.string().url(),
        projectId: z.string().uuid().nullable().optional(),
        leadId: z.string().uuid().nullable().optional(),
        type: z.enum(["before", "after", "progress", "receipt", "document"]),
        mimeType: z.string(),
        sizeBytes: z.number().int().positive(),
        generateCaption: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let aiCaption: string | null = null

      // Auto-generate caption for visual media types
      if (
        input.generateCaption &&
        ["before", "after", "progress"].includes(input.type) &&
        input.mimeType.startsWith("image/")
      ) {
        try {
          const projectType = input.projectId
            ? await getProjectType(ctx.tenantId, input.projectId)
            : "renovation"

          const prompt =
            input.type === "after"
              ? `Write a compelling 2-sentence marketing caption for this completed ${projectType} project photo. Highlight the transformation — warm, professional, client-facing. No hashtags.`
              : `Write a brief 1-sentence professional caption for this ${input.type} photo of a ${projectType} project.`

          const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 256,
            messages: [
              {
                role: "user",
                content: [
                  { type: "image", source: { type: "url", url: input.publicUrl } },
                  { type: "text", text: prompt },
                ],
              },
            ],
          })

          aiCaption =
            response.content[0].type === "text"
              ? response.content[0].text.trim()
              : null
        } catch {
          // Caption generation is best-effort, don't fail the upload
        }
      }

      return withTenant(ctx.tenantId, async (tx) => {
        const [asset] = await tx
          .insert(mediaAssets)
          .values({
            tenantId: ctx.tenantId,
            projectId: input.projectId ?? null,
            leadId: input.leadId ?? null,
            url: input.publicUrl,
            type: input.type,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            aiCaption,
          })
          .returning()

        return asset
      })
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        type: z.enum(["before", "after", "progress", "receipt", "document"]).optional(),
        publishedToSite: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const conditions = []
        if (input.projectId) conditions.push(eq(mediaAssets.projectId, input.projectId))
        if (input.type) conditions.push(eq(mediaAssets.type, input.type))
        if (input.publishedToSite !== undefined)
          conditions.push(eq(mediaAssets.publishedToSite, input.publishedToSite))

        return tx
          .select()
          .from(mediaAssets)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(mediaAssets.createdAt))
          .limit(input.limit)
          .offset(input.offset)
      })
    }),

  publish: requireRole("manager")
    .input(
      z.object({
        id: z.string().uuid(),
        publishToSite: z.boolean().optional(),
        publishToSocial: z.boolean().optional(),
        caption: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const updates: Record<string, unknown> = {}
        if (input.publishToSite !== undefined) updates.publishedToSite = input.publishToSite
        if (input.publishToSocial !== undefined) updates.publishedToSocial = input.publishToSocial
        if (input.caption !== undefined) updates.aiCaption = input.caption

        const [asset] = await tx
          .update(mediaAssets)
          .set(updates)
          .where(eq(mediaAssets.id, input.id))
          .returning()

        if (!asset) throw new TRPCError({ code: "NOT_FOUND" })

        // If publishing to site, enqueue content generation job
        if (input.publishToSite && asset.projectId) {
          await enqueueCaseStudyGeneration(ctx.tenantId, asset.projectId)
        }

        return asset
      })
    }),

  // Returns before/after pairs for a project — used by case study generator
  beforeAfterPairs: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const assets = await tx
          .select()
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.projectId, input.projectId),
              eq(mediaAssets.publishedToSite, true)
            )
          )
          .orderBy(mediaAssets.createdAt)

        return {
          before: assets.filter((a) => a.type === "before"),
          after: assets.filter((a) => a.type === "after"),
          progress: assets.filter((a) => a.type === "progress"),
        }
      })
    }),
})

async function getProjectType(tenantId: string, projectId: string) {
  const { db } = await import("@buildos/db")
  const rows = await db
    .select({ type: projects.type })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return rows[0]?.type ?? "renovation"
}

// Placeholder — Phase 2 wires this to BullMQ
async function enqueueCaseStudyGeneration(tenantId: string, projectId: string) {
  console.log(`[content-machine] enqueue case-study for project ${projectId} tenant ${tenantId}`)
}
