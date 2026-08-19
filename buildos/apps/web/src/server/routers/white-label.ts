import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { db } from "@buildos/db"
import { whitelabelConfigs } from "@buildos/db/src/schema-phase5"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { assertFeatureAccess } from "@/server/billing/plan-gate"

export const whiteLabelRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await db
      .select()
      .from(whitelabelConfigs)
      .where(eq(whitelabelConfigs.tenantId, ctx.tenantId))
      .limit(1)

    return config ?? null
  }),

  upsert: requireRole("admin")
    .input(
      z.object({
        brandName: z.string().min(1),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        logoUrl: z.string().url().nullable().optional(),
        faviconUrl: z.string().url().nullable().optional(),
        supportEmail: z.string().email().nullable().optional(),
        hideBuiltWith: z.boolean().optional(),
        customCss: z.string().max(10000).nullable().optional(),
        customDomain: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertFeatureAccess(ctx.tenantId, "white_label")

      const existing = await db
        .select({ id: whitelabelConfigs.id })
        .from(whitelabelConfigs)
        .where(eq(whitelabelConfigs.tenantId, ctx.tenantId))
        .limit(1)

      if (existing.length > 0) {
        const [updated] = await db
          .update(whitelabelConfigs)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(whitelabelConfigs.tenantId, ctx.tenantId))
          .returning()
        return updated
      }

      const [created] = await db
        .insert(whitelabelConfigs)
        .values({ tenantId: ctx.tenantId, ...input })
        .returning()

      return created
    }),

  // Returns CSS variables for the tenant's brand — injected by middleware
  brandTokens: protectedProcedure.query(async ({ ctx }) => {
    const [config] = await db
      .select({
        primaryColor: whitelabelConfigs.primaryColor,
        brandName: whitelabelConfigs.brandName,
        logoUrl: whitelabelConfigs.logoUrl,
        customCss: whitelabelConfigs.customCss,
      })
      .from(whitelabelConfigs)
      .where(eq(whitelabelConfigs.tenantId, ctx.tenantId))
      .limit(1)

    if (!config) {
      return {
        primaryColor: "#14B8A6",
        brandName: "Build OS",
        logoUrl: null,
        customCss: null,
      }
    }

    return config
  }),
})
