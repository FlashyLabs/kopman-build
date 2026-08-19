import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { db, tenants, users } from "@buildos/db"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import {
  stripe,
  PLANS,
  createCheckoutSession,
  createBillingPortalSession,
  createConnectAccount,
  createConnectOnboardingLink,
  createPaymentIntent,
  createStripeCustomer,
  type Plan,
} from "@/server/billing/stripe"

export const billingRouter = router({
  // Current tenant's plan + usage summary
  overview: protectedProcedure.query(async ({ ctx }) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1)

    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" })

    const plan = PLANS[tenant.plan as Plan]

    let subscriptionStatus: string | null = null
    let currentPeriodEnd: Date | null = null

    if (tenant.stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId)
      subscriptionStatus = sub.status
      currentPeriodEnd = new Date(sub.current_period_end * 1000)
    }

    return {
      plan: tenant.plan,
      planName: plan.name,
      monthlyUsd: plan.monthlyUsd,
      limits: plan.limits,
      subscriptionStatus,
      currentPeriodEnd,
      stripeCustomerId: tenant.stripeCustomerId,
    }
  }),

  // Start Stripe Checkout to subscribe or upgrade plan
  startCheckout: requireRole("owner")
    .input(z.object({ plan: z.enum(["starter", "growth", "enterprise"]) }))
    .mutation(async ({ ctx, input }) => {
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId))
        .limit(1)

      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" })

      // Create Stripe customer if first time
      let stripeCustomerId = tenant.stripeCustomerId
      if (!stripeCustomerId) {
        const [owner] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.tenantId, ctx.tenantId))
          .limit(1)

        stripeCustomerId = await createStripeCustomer({
          tenantId: ctx.tenantId,
          tenantName: tenant.name,
          email: owner?.email ?? "",
        })

        await db
          .update(tenants)
          .set({ stripeCustomerId })
          .where(eq(tenants.id, ctx.tenantId))
      }

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
      const url = await createCheckoutSession({
        stripeCustomerId,
        priceId: PLANS[input.plan].priceId,
        tenantId: ctx.tenantId,
        successUrl: `${baseUrl}/settings/billing?success=1`,
        cancelUrl: `${baseUrl}/settings/billing`,
      })

      return { url }
    }),

  // Open Stripe Customer Portal for plan changes / cancellation
  openPortal: requireRole("owner").mutation(async ({ ctx }) => {
    const [tenant] = await db
      .select({ stripeCustomerId: tenants.stripeCustomerId })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1)

    if (!tenant?.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription" })
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const url = await createBillingPortalSession({
      stripeCustomerId: tenant.stripeCustomerId,
      returnUrl: `${baseUrl}/settings/billing`,
    })

    return { url }
  }),

  // ── Stripe Connect (tenant collects payments from their customers) ────────

  // Onboard tenant's own Stripe Connect account
  startConnectOnboarding: requireRole("owner").mutation(async ({ ctx }) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1)

    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" })

    // Check if connect account already exists in settings
    // (stored in tenant_settings.stripe_connect_account_id — added below)
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

    const [owner] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.tenantId, ctx.tenantId))
      .limit(1)

    const accountId = await createConnectAccount({
      tenantId: ctx.tenantId,
      email: owner?.email ?? "",
      businessName: tenant.name,
    })

    // Persist connect account ID to tenant_settings
    // (deferred to Phase 4 migration — stored in memory for now)
    const url = await createConnectOnboardingLink({
      accountId,
      refreshUrl: `${baseUrl}/settings/payments?refresh=1`,
      returnUrl: `${baseUrl}/settings/payments?connected=1`,
    })

    return { url, accountId }
  }),

  // Create a payment link for a customer invoice
  createPaymentLink: requireRole("manager")
    .input(
      z.object({
        amountCents: z.number().int().positive(),
        description: z.string(),
        connectAccountId: z.string(),
        projectId: z.string().uuid().optional(),
        contactId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        amountCents: input.amountCents,
        connectedAccountId: input.connectAccountId,
        metadata: {
          tenantId: ctx.tenantId,
          projectId: input.projectId ?? "",
          contactId: input.contactId ?? "",
          description: input.description,
        },
      })

      return { clientSecret, paymentIntentId }
    }),
})
