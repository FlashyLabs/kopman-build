import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, referrals, contacts, leads } from "@buildos/db"
import { eq, desc, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { sendReferralRewardEmail, sendReferralInviteEmail } from "@/server/email/templates"

// Reward tiers — configurable per tenant in Phase 3
const REWARD_TIERS = [
  { minValue: 0,      reward: 25000  },   // $250 for any job
  { minValue: 1000000, reward: 50000 },   // $500 for $10k+ job
  { minValue: 5000000, reward: 100000 },  // $1000 for $50k+ job
] as const

function calculateReward(contractValueCents: number): number {
  const tier = [...REWARD_TIERS]
    .reverse()
    .find((t) => contractValueCents >= t.minValue)
  return tier?.reward ?? REWARD_TIERS[0].reward
}

// Points awarded to referrer's loyalty balance on conversion
const REFERRAL_LOYALTY_POINTS = 500

export const referralsRouter = router({
  // Create a referral — field staff logs who referred a new lead
  create: requireRole("field")
    .input(
      z.object({
        referrerId: z.string().uuid(),
        leadId: z.string().uuid().optional(),
        referredEmail: z.string().email().optional(),
        referredName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        // Verify referrer exists in this tenant
        const [referrer] = await tx
          .select({ id: contacts.id, email: contacts.email, firstName: contacts.firstName })
          .from(contacts)
          .where(eq(contacts.id, input.referrerId))
          .limit(1)

        if (!referrer) throw new TRPCError({ code: "NOT_FOUND", message: "Referrer not found" })

        const [referral] = await tx
          .insert(referrals)
          .values({
            tenantId: ctx.tenantId,
            referrerId: input.referrerId,
            leadId: input.leadId ?? null,
            status: "pending",
            rewardAmount: 0, // set on conversion
          })
          .returning()

        // Send thank-you + referral tracking email to referrer
        if (referrer.email) {
          await sendReferralInviteEmail({
            to: referrer.email,
            referrerName: referrer.firstName,
            referralId: referral.id,
          }).catch(() => null) // best-effort
        }

        return referral
      })
    }),

  // Called when a referred lead converts to a won project
  markConverted: requireRole("manager")
    .input(
      z.object({
        referralId: z.string().uuid(),
        referredContactId: z.string().uuid(),
        contractValueCents: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [referral] = await tx
          .select()
          .from(referrals)
          .where(eq(referrals.id, input.referralId))
          .limit(1)

        if (!referral) throw new TRPCError({ code: "NOT_FOUND" })
        if (referral.status !== "pending") {
          throw new TRPCError({ code: "CONFLICT", message: "Referral already converted" })
        }

        const rewardAmount = calculateReward(input.contractValueCents)

        const [updated] = await tx
          .update(referrals)
          .set({
            referredId: input.referredContactId,
            status: "converted",
            rewardAmount,
          })
          .where(eq(referrals.id, input.referralId))
          .returning()

        // Award loyalty points to referrer
        await tx
          .update(contacts)
          .set({
            loyaltyPoints: sql`loyalty_points + ${REFERRAL_LOYALTY_POINTS}`,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, referral.referrerId))

        return updated
      })
    }),

  // Mark reward as paid (cheque, e-transfer, account credit)
  markRewarded: requireRole("manager")
    .input(
      z.object({
        referralId: z.string().uuid(),
        paymentMethod: z.enum(["etransfer", "cheque", "credit"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [referral] = await tx
          .select()
          .from(referrals)
          .where(eq(referrals.id, input.referralId))
          .limit(1)

        if (!referral) throw new TRPCError({ code: "NOT_FOUND" })
        if (referral.status !== "converted") {
          throw new TRPCError({ code: "CONFLICT", message: "Referral must be converted first" })
        }

        const [updated] = await tx
          .update(referrals)
          .set({ status: "rewarded", rewardPaidAt: new Date() })
          .where(eq(referrals.id, input.referralId))
          .returning()

        // Notify referrer via email
        const [referrer] = await tx
          .select({ email: contacts.email, firstName: contacts.firstName })
          .from(contacts)
          .where(eq(contacts.id, referral.referrerId))
          .limit(1)

        if (referrer?.email) {
          await sendReferralRewardEmail({
            to: referrer.email,
            referrerName: referrer.firstName,
            rewardAmount: referral.rewardAmount,
            paymentMethod: input.paymentMethod,
          }).catch(() => null)
        }

        return updated
      })
    }),

  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "converted", "rewarded"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(referrals)
          .where(input.status ? eq(referrals.status, input.status) : undefined)
          .orderBy(desc(referrals.createdAt))
          .limit(input.limit)
          .offset(input.offset)
      })
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    return withTenant(ctx.tenantId, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<number>`count(*)::int`,
          converted: sql<number>`count(*) filter (where status = 'converted')::int`,
          rewarded: sql<number>`count(*) filter (where status = 'rewarded')::int`,
          totalRewardsPaid: sql<number>`coalesce(sum(reward_amount) filter (where status = 'rewarded'), 0)::int`,
          conversionRate: sql<number>`
            round(
              100.0 * count(*) filter (where status in ('converted','rewarded')) / nullif(count(*), 0),
              1
            )::float`,
        })
        .from(referrals)

      return row
    })
  }),
})
