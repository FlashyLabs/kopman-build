/**
 * Stripe webhook handler
 * Verifies signature, routes events to handlers.
 * Register endpoint in Stripe dashboard → Webhooks → Add endpoint:
 *   https://your-domain.com/api/webhooks/stripe
 *   Events: checkout.session.completed, customer.subscription.updated,
 *           customer.subscription.deleted, invoice.payment_failed
 */

import { stripe } from "@/server/billing/stripe"
import { db, tenants } from "@buildos/db"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Ignore unhandled event types
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId
  if (!tenantId || session.mode !== "subscription") return

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id

  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id

  // Map price ID back to plan name
  const planEntry = Object.entries({
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  }).find(([, id]) => id === priceId)

  const plan = (planEntry?.[0] ?? "starter") as "starter" | "growth" | "enterprise"

  await db
    .update(tenants)
    .set({
      plan,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: session.customer as string,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId
  if (!tenantId) return

  const priceId = subscription.items.data[0]?.price.id

  const planEntry = Object.entries({
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  }).find(([, id]) => id === priceId)

  const plan = (planEntry?.[0] ?? "starter") as "starter" | "growth" | "enterprise"

  await db
    .update(tenants)
    .set({ plan, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId
  if (!tenantId) return

  // Downgrade to starter (free tier) on cancellation
  await db
    .update(tenants)
    .set({
      plan: "starter",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId))
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // TODO Phase 4: send dunning email via Resend, flag tenant for follow-up
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
  console.error(`Payment failed for Stripe customer: ${customerId}`)
}
