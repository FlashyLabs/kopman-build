import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, contacts, projects } from "@buildos/db"
import { eq, desc, sql, gte } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

/**
 * Loyalty Program — Kopman Build Points
 *
 * Points earned:
 *   - Project completion:  1 pt per $100 of contract value
 *   - Referral:            500 pts flat
 *   - Review left:         200 pts (field staff confirms)
 *   - 5-star review:       100 bonus pts
 *   - Repeat customer:     250 pts on 2nd+ project
 *
 * Points redeemed:
 *   - $25 off next project per 100 pts (0.25/pt)
 *   - Free design consultation at 1000 pts
 *   - Priority scheduling at 2000 pts
 */

export const POINTS_RATE = {
  perHundredDollars: 1,
  referral: 500,
  review: 200,
  fiveStarBonus: 100,
  repeatCustomer: 250,
} as const

// Redemption: 100 pts = $25 off (in cents)
export const POINTS_REDEMPTION_VALUE = 2500

export const loyaltyRouter = router({
  // Award points for a completed project
  awardProjectPoints: requireRole("manager")
    .input(
      z.object({
        contactId: z.string().uuid(),
        projectId: z.string().uuid(),
        contractValueCents: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .select()
          .from(contacts)
          .where(eq(contacts.id, input.contactId))
          .limit(1)

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" })

        const projectPoints = Math.floor(input.contractValueCents / 10000) * POINTS_RATE.perHundredDollars
        const repeatBonus = contact.projectCount >= 1 ? POINTS_RATE.repeatCustomer : 0
        const total = projectPoints + repeatBonus

        const [updated] = await tx
          .update(contacts)
          .set({
            loyaltyPoints: sql`loyalty_points + ${total}`,
            totalSpend: sql`total_spend + ${input.contractValueCents}`,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.contactId))
          .returning()

        return { pointsAwarded: total, newBalance: updated.loyaltyPoints, repeatBonus }
      })
    }),

  // Award points for a review
  awardReviewPoints: requireRole("field")
    .input(
      z.object({
        contactId: z.string().uuid(),
        isFiveStar: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const total =
          POINTS_RATE.review + (input.isFiveStar ? POINTS_RATE.fiveStarBonus : 0)

        const [updated] = await tx
          .update(contacts)
          .set({
            loyaltyPoints: sql`loyalty_points + ${total}`,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.contactId))
          .returning()

        if (!updated) throw new TRPCError({ code: "NOT_FOUND" })
        return { pointsAwarded: total, newBalance: updated.loyaltyPoints }
      })
    }),

  // Redeem points against an upcoming project (creates a discount record)
  redeem: requireRole("manager")
    .input(
      z.object({
        contactId: z.string().uuid(),
        pointsToRedeem: z.number().int().positive().multipleOf(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .select({ loyaltyPoints: contacts.loyaltyPoints })
          .from(contacts)
          .where(eq(contacts.id, input.contactId))
          .limit(1)

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" })
        if (contact.loyaltyPoints < input.pointsToRedeem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient points. Balance: ${contact.loyaltyPoints}, requested: ${input.pointsToRedeem}`,
          })
        }

        const discountCents = (input.pointsToRedeem / 100) * POINTS_REDEMPTION_VALUE

        const [updated] = await tx
          .update(contacts)
          .set({
            loyaltyPoints: sql`loyalty_points - ${input.pointsToRedeem}`,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.contactId))
          .returning()

        return {
          pointsRedeemed: input.pointsToRedeem,
          discountCents,
          newBalance: updated.loyaltyPoints,
        }
      })
    }),

  // Leaderboard — top contacts by points
  leaderboard: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            loyaltyPoints: contacts.loyaltyPoints,
            totalSpend: contacts.totalSpend,
            projectCount: contacts.projectCount,
          })
          .from(contacts)
          .where(gte(contacts.loyaltyPoints, 1))
          .orderBy(desc(contacts.loyaltyPoints))
          .limit(input.limit)
      })
    }),

  // Tier classification for a contact
  getTier: protectedProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .select({
            loyaltyPoints: contacts.loyaltyPoints,
            totalSpend: contacts.totalSpend,
            projectCount: contacts.projectCount,
          })
          .from(contacts)
          .where(eq(contacts.id, input.contactId))
          .limit(1)

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" })

        const tier =
          contact.loyaltyPoints >= 2000 || contact.totalSpend >= 10000000
            ? "platinum"
            : contact.loyaltyPoints >= 1000 || contact.totalSpend >= 5000000
            ? "gold"
            : contact.loyaltyPoints >= 500
            ? "silver"
            : "bronze"

        const benefits = {
          bronze: ["Birthday discount email", "Project updates"],
          silver: ["5% referral bonus", "Priority email support"],
          gold: ["Free design consultation", "Priority scheduling", "10% referral bonus"],
          platinum: ["Dedicated account manager", "Free annual maintenance visit", "15% referral bonus"],
        }

        return { tier, benefits: benefits[tier], ...contact }
      })
    }),
})
