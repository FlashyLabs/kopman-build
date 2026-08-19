import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { db, withTenant } from "@buildos/db"
import {
  marketplaceProfiles,
  marketplaceLeads,
  leadPurchases,
} from "@buildos/db/src/schema-phase5"
import { eq, and, desc, sql, inArray } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { stripe } from "@/server/billing/stripe"
import { assertFeatureAccess } from "@/server/billing/plan-gate"

// Lead TTL on marketplace — 72 hours before expiry
const LEAD_TTL_HOURS = 72
// Platform commission rate
const PLATFORM_COMMISSION = 0.10

export const marketplaceRouter = router({
  // ── Seller side (origin tenant) ──────────────────────────────────────────

  // Create / update marketplace profile
  upsertProfile: requireRole("admin")
    .input(
      z.object({
        displayName: z.string().min(1),
        tagline: z.string().optional(),
        description: z.string().optional(),
        logoUrl: z.string().url().nullable().optional(),
        serviceTypes: z.array(z.string()).optional(),
        serviceAreas: z.array(z.string()).optional(),
        leadPriceFloor: z.number().int().min(0).optional(),
        acceptingLeads: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ id: marketplaceProfiles.id })
        .from(marketplaceProfiles)
        .where(eq(marketplaceProfiles.tenantId, ctx.tenantId))
        .limit(1)

      if (existing.length > 0) {
        const [updated] = await db
          .update(marketplaceProfiles)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(marketplaceProfiles.tenantId, ctx.tenantId))
          .returning()
        return updated
      }

      const [created] = await db
        .insert(marketplaceProfiles)
        .values({ tenantId: ctx.tenantId, ...input })
        .returning()
      return created
    }),

  // List a lead on the marketplace (origin tenant sells overflow leads)
  listLead: requireRole("manager")
    .input(
      z.object({
        projectType: z.string().min(1),
        city: z.string().min(1),
        neighbourhood: z.string().optional(),
        estimatedValue: z.number().int().positive().optional(),
        summary: z.string().min(1),      // no PII — AI-generated summary
        photoUrls: z.array(z.string().url()).optional(),
        listPriceCents: z.number().int().min(1000),   // min $10
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date(Date.now() + LEAD_TTL_HOURS * 60 * 60 * 1000)

      const [lead] = await db
        .insert(marketplaceLeads)
        .values({
          originTenantId: ctx.tenantId,
          projectType: input.projectType,
          city: input.city,
          neighbourhood: input.neighbourhood ?? null,
          estimatedValue: input.estimatedValue ?? null,
          summary: input.summary,
          photoUrls: input.photoUrls ?? [],
          listPrice: input.listPriceCents,
          commissionRate: PLATFORM_COMMISSION,
          expiresAt,
        })
        .returning()

      return lead
    }),

  // ── Buyer side (any tenant) ───────────────────────────────────────────────

  // Browse available leads on the marketplace
  browse: protectedProcedure
    .input(
      z.object({
        projectType: z.string().optional(),
        city: z.string().optional(),
        minValue: z.number().int().optional(),
        maxPrice: z.number().int().optional(),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(marketplaceLeads.status, "available"),
        sql`expires_at > now()`,
        // Exclude own leads
        sql`origin_tenant_id != ${ctx.tenantId}`,
      ]

      if (input.projectType) conditions.push(eq(marketplaceLeads.projectType, input.projectType))
      if (input.city) conditions.push(eq(marketplaceLeads.city, input.city))
      if (input.maxPrice) conditions.push(sql`list_price <= ${input.maxPrice}`)
      if (input.minValue) conditions.push(sql`estimated_value >= ${input.minValue}`)

      return db
        .select({
          id: marketplaceLeads.id,
          projectType: marketplaceLeads.projectType,
          city: marketplaceLeads.city,
          neighbourhood: marketplaceLeads.neighbourhood,
          estimatedValue: marketplaceLeads.estimatedValue,
          summary: marketplaceLeads.summary,
          photoUrls: marketplaceLeads.photoUrls,
          listPrice: marketplaceLeads.listPrice,
          expiresAt: marketplaceLeads.expiresAt,
          createdAt: marketplaceLeads.createdAt,
        })
        .from(marketplaceLeads)
        .where(and(...conditions))
        .orderBy(desc(marketplaceLeads.createdAt))
        .limit(input.limit)
        .offset(input.offset)
    }),

  // Claim a lead — initiates Stripe payment, then releases contact info
  claimLead: requireRole("manager")
    .input(
      z.object({
        marketplaceLeadId: z.string().uuid(),
        connectAccountId: z.string(),  // buyer's Stripe Connect account
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [lead] = await db
        .select()
        .from(marketplaceLeads)
        .where(eq(marketplaceLeads.id, input.marketplaceLeadId))
        .limit(1)

      if (!lead) throw new TRPCError({ code: "NOT_FOUND" })
      if (lead.status !== "available") {
        throw new TRPCError({ code: "CONFLICT", message: "Lead is no longer available" })
      }
      if (lead.originTenantId === ctx.tenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot buy your own lead" })
      }

      const platformFee = Math.round(lead.listPrice * PLATFORM_COMMISSION)

      // Create payment intent — buyer pays list price, platform takes fee
      const pi = await stripe.paymentIntents.create({
        amount: lead.listPrice,
        currency: "cad",
        automatic_payment_methods: { enabled: true },
        application_fee_amount: platformFee,
        transfer_data: {
          destination: input.connectAccountId,
        },
        metadata: {
          marketplaceLeadId: lead.id,
          buyerTenantId: ctx.tenantId,
        },
      })

      // Create purchase record (pending until payment confirmed via webhook)
      const [purchase] = await db
        .insert(leadPurchases)
        .values({
          marketplaceLeadId: lead.id,
          buyerTenantId: ctx.tenantId,
          pricePaidCents: lead.listPrice,
          platformFeeCents: platformFee,
          stripePaymentIntentId: pi.id,
          status: "pending",
        })
        .returning()

      return {
        purchaseId: purchase.id,
        clientSecret: pi.client_secret!,
        amountCents: lead.listPrice,
      }
    }),

  // Called via webhook after payment confirmed — releases contact info to buyer
  releaseLead: requireRole("owner")
    .input(z.object({ marketplaceLeadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(marketplaceLeads)
        .set({
          status: "claimed",
          claimedByTenantId: ctx.tenantId,
          claimedAt: new Date(),
          contactReleasedAt: new Date(),
        })
        .where(eq(marketplaceLeads.id, input.marketplaceLeadId))

      return { released: true }
    }),

  // Buyer's purchased leads
  myPurchases: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return db
        .select({
          purchase: leadPurchases,
          lead: marketplaceLeads,
        })
        .from(leadPurchases)
        .innerJoin(marketplaceLeads, eq(leadPurchases.marketplaceLeadId, marketplaceLeads.id))
        .where(eq(leadPurchases.buyerTenantId, ctx.tenantId))
        .orderBy(desc(leadPurchases.createdAt))
        .limit(input.limit)
    }),

  // Revenue from leads sold (origin tenant view)
  salesRevenue: protectedProcedure.query(async ({ ctx }) => {
    const [stats] = await db.execute(sql`
      SELECT
        COUNT(lp.id)::int                                        AS leads_sold,
        COALESCE(SUM(lp.price_paid_cents), 0)::int               AS gross_revenue,
        COALESCE(SUM(lp.platform_fee_cents), 0)::int             AS platform_fees,
        COALESCE(SUM(lp.price_paid_cents - lp.platform_fee_cents), 0)::int AS net_revenue
      FROM lead_purchases lp
      JOIN marketplace_leads ml ON ml.id = lp.marketplace_lead_id
      WHERE ml.origin_tenant_id = ${ctx.tenantId}
        AND lp.status = 'paid'
    `)

    return stats as {
      leads_sold: number
      gross_revenue: number
      platform_fees: number
      net_revenue: number
    }
  }),
})
