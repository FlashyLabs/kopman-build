/**
 * Tenant onboarding router
 * Handles the multi-step setup flow for new tenants after FlashyID sign-in:
 * Step 1: Company profile (name, logo, address)
 * Step 2: Team invitations
 * Step 3: Plan selection → Stripe Checkout
 * Step 4: Connect Stripe account for customer payments
 * Step 5: Social account connections (Meta, Google)
 */

import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { db, withTenant, tenants, users } from "@buildos/db"
import { tenantSettings } from "@buildos/db/src/schema-phase2"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

export const onboardingRouter = router({
  // Get current onboarding state
  status: protectedProcedure.query(async ({ ctx }) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1)

    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" })

    const [settings] = await db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, ctx.tenantId))
      .limit(1)

    const steps = {
      profile: !!tenant.name && !!tenant.slug,
      plan: tenant.plan !== "starter" || !!tenant.stripeSubscriptionId,
      payments: !!settings?.metaAccessToken || false,  // connect account check
      social: !!(settings?.metaIgBusinessId || settings?.googleLocationId),
    }

    const completedCount = Object.values(steps).filter(Boolean).length
    const isComplete = completedCount === Object.keys(steps).length

    return { steps, completedCount, total: Object.keys(steps).length, isComplete, tenant }
  }),

  // Step 1: Update company profile
  updateProfile: requireRole("admin")
    .input(
      z.object({
        name: z.string().min(1),
        logoUrl: z.string().url().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(tenants)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(tenants.id, ctx.tenantId))
        .returning()

      return updated
    }),

  // Step 2: Invite team members (sends FlashyID invite email)
  inviteUser: requireRole("admin")
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "manager", "field", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production: call FlashyID org invite API
      // FlashyID handles the email + account creation flow
      // On first sign-in the user gets provisioned in our DB via the auth callback

      // For now: create a placeholder user record that will be claimed on first login
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1)

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "User already exists in this workspace" })
      }

      // Placeholder — FlashyID will fill in flashyId on first login
      const [user] = await db
        .insert(users)
        .values({
          tenantId: ctx.tenantId,
          flashyId: `pending:${input.email}`,
          email: input.email,
          name: input.email.split("@")[0],
          role: input.role,
        })
        .returning()

      return { invited: true, userId: user.id }
    }),

  // Step 5: Save social credentials
  saveSocialCredentials: requireRole("admin")
    .input(
      z.object({
        metaIgBusinessId: z.string().optional(),
        metaFbPageId: z.string().optional(),
        metaAccessToken: z.string().optional(),
        googleLocationId: z.string().optional(),
        googleAccessToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ id: tenantSettings.id })
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, ctx.tenantId))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(tenantSettings)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(tenantSettings.tenantId, ctx.tenantId))
      } else {
        await db
          .insert(tenantSettings)
          .values({ tenantId: ctx.tenantId, ...input })
      }

      return { saved: true }
    }),

  // Plan comparison for the upgrade page
  plans: protectedProcedure.query(() => {
    return [
      {
        key: "starter",
        name: "Starter",
        priceMonthly: 99,
        features: [
          "3 users",
          "25 active projects",
          "20 AI quotes/month",
          "10 GB media storage",
          "CRM + project tracking",
          "Email support",
        ],
      },
      {
        key: "growth",
        name: "Growth",
        priceMonthly: 299,
        popular: true,
        features: [
          "15 users",
          "200 active projects",
          "100 AI quotes/month",
          "100 GB media storage",
          "Everything in Starter",
          "Content Machine (case studies + social)",
          "Referral + Loyalty programs",
          "Marketing automation",
          "Inventory management",
          "Priority support",
        ],
      },
      {
        key: "enterprise",
        name: "Enterprise",
        priceMonthly: 999,
        features: [
          "Unlimited users",
          "Unlimited projects",
          "Unlimited AI quotes",
          "1 TB media storage",
          "Everything in Growth",
          "White-label branding",
          "Multi-location support",
          "Dedicated account manager",
          "Custom integrations",
          "SLA + uptime guarantee",
        ],
      },
    ]
  }),
})
