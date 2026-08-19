import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, mediaAssets, projects } from "@buildos/db"
import { eq, and, desc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { generateCaseStudy } from "@/server/content-machine/case-study"
import { publishSocialPost, type SocialCredentials } from "@/server/content-machine/social-scheduler"

export const contentRouter = router({
  // Generate a full content package from a completed project's media
  generateCaseStudy: requireRole("manager")
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await generateCaseStudy(ctx.tenantId, input.projectId)
      // TODO Phase 2: persist to content_pieces table
      return result
    }),

  // Publish a social post immediately (manager+)
  publishSocial: requireRole("manager")
    .input(
      z.object({
        platform: z.enum(["instagram", "facebook", "google"]),
        caption: z.string().min(1),
        imageUrls: z.array(z.string().url()),
        projectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Credentials come from tenant settings (Phase 2 adds settings table)
      // For now, read from env — single-tenant bootstrap
      const credentials: SocialCredentials = {
        meta: process.env.META_IG_BUSINESS_ID
          ? {
              igBusinessId: process.env.META_IG_BUSINESS_ID,
              fbPageId: process.env.META_FB_PAGE_ID ?? "",
              accessToken: process.env.META_ACCESS_TOKEN ?? "",
            }
          : undefined,
        google: process.env.GOOGLE_LOCATION_ID
          ? {
              locationId: process.env.GOOGLE_LOCATION_ID,
              accessToken: process.env.GOOGLE_ACCESS_TOKEN ?? "",
            }
          : undefined,
      }

      const results = await publishSocialPost(
        {
          platform: input.platform,
          caption: input.caption,
          imageUrls: input.imageUrls,
        },
        credentials
      )

      // Mark assets as published to social
      if (input.projectId && results.some((r) => r.status === "published")) {
        await withTenant(ctx.tenantId, async (tx) => {
          // Mark all images used in this post as published to social
          for (const url of input.imageUrls) {
            await tx
              .update(mediaAssets)
              .set({ publishedToSocial: true })
              .where(eq(mediaAssets.url, url))
          }
        })
      }

      return results
    }),

  // Returns projects with before+after photos ready to publish
  publishableProjects: protectedProcedure.query(async ({ ctx }) => {
    return withTenant(ctx.tenantId, async (tx) => {
      // Projects that are completed and have at least 1 before + 1 after
      const completedProjects = await tx
        .select()
        .from(projects)
        .where(eq(projects.status, "completed"))
        .orderBy(desc(projects.updatedAt))
        .limit(20)

      const results = await Promise.all(
        completedProjects.map(async (p) => {
          const media = await tx
            .select({ type: mediaAssets.type, publishedToSite: mediaAssets.publishedToSite })
            .from(mediaAssets)
            .where(eq(mediaAssets.projectId, p.id))

          const hasBefore = media.some((m) => m.type === "before")
          const hasAfter = media.some((m) => m.type === "after")
          const publishedCount = media.filter((m) => m.publishedToSite).length

          return { ...p, hasBefore, hasAfter, publishedMediaCount: publishedCount }
        })
      )

      return results.filter((p) => p.hasBefore && p.hasAfter)
    })
  }),
})
