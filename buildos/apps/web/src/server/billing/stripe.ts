/**
 * Stripe client + plan definitions
 *
 * Two Stripe products:
 * 1. Build OS SaaS subscription (Kopman charges other tenants)
 * 2. Stripe Connect (each tenant collects payments from their own customers)
 */

import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
})

// ── SaaS Plan Definitions ──────────────────────────────────────────────────
// Price IDs come from env — created once in Stripe dashboard / seed script

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER!,
    monthlyUsd: 9900,        // $99/mo
    limits: {
      users: 3,
      projects: 25,
      aiQuotesPerMonth: 20,
      mediaStorageGb: 10,
    },
  },
  growth: {
    name: "Growth",
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    monthlyUsd: 29900,       // $299/mo
    limits: {
      users: 15,
      projects: 200,
      aiQuotesPerMonth: 100,
      mediaStorageGb: 100,
    },
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ENTERPRISE!,
    monthlyUsd: 99900,       // $999/mo
    limits: {
      users: Infinity,
      projects: Infinity,
      aiQuotesPerMonth: Infinity,
      mediaStorageGb: 1000,
    },
  },
} as const

export type Plan = keyof typeof PLANS

// ── Helpers ────────────────────────────────────────────────────────────────

export async function createStripeCustomer(opts: {
  tenantId: string
  tenantName: string
  email: string
}): Promise<string> {
  const customer = await stripe.customers.create({
    name: opts.tenantName,
    email: opts.email,
    metadata: { tenantId: opts.tenantId },
  })
  return customer.id
}

export async function createCheckoutSession(opts: {
  stripeCustomerId: string
  priceId: string
  tenantId: string
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: opts.stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { tenantId: opts.tenantId },
    subscription_data: {
      metadata: { tenantId: opts.tenantId },
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
  })
  return session.url!
}

export async function createBillingPortalSession(opts: {
  stripeCustomerId: string
  returnUrl: string
}): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: opts.stripeCustomerId,
    return_url: opts.returnUrl,
  })
  return session.url
}

// ── Stripe Connect (tenant → their customers) ──────────────────────────────

export async function createConnectAccount(opts: {
  tenantId: string
  email: string
  businessName: string
  country?: string
}): Promise<string> {
  const account = await stripe.accounts.create({
    type: "standard",
    email: opts.email,
    business_profile: { name: opts.businessName },
    country: opts.country ?? "CA",
    metadata: { tenantId: opts.tenantId },
  })
  return account.id
}

export async function createConnectOnboardingLink(opts: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: opts.accountId,
    refresh_url: opts.refreshUrl,
    return_url: opts.returnUrl,
    type: "account_onboarding",
  })
  return link.url
}

// Create a payment intent on behalf of a connected tenant (for customer invoices)
export async function createPaymentIntent(opts: {
  amountCents: number
  currency?: string
  connectedAccountId: string
  metadata?: Record<string, string>
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const pi = await stripe.paymentIntents.create(
    {
      amount: opts.amountCents,
      currency: opts.currency ?? "cad",
      automatic_payment_methods: { enabled: true },
      metadata: opts.metadata ?? {},
    },
    { stripeAccount: opts.connectedAccountId }
  )
  return { clientSecret: pi.client_secret!, paymentIntentId: pi.id }
}
