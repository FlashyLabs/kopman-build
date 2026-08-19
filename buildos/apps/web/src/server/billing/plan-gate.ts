/**
 * Plan gating — checks tenant's current plan limits before allowing actions.
 * Use as a tRPC middleware or call directly inside mutation handlers.
 */

import { TRPCError } from "@trpc/server"
import { db, tenants, users, projects, aiQuoteJobs } from "@buildos/db"
import { eq, gte, count, and, sql } from "drizzle-orm"
import { PLANS, type Plan } from "./stripe"

async function getTenantPlan(tenantId: string): Promise<Plan> {
  const [tenant] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)

  return (tenant?.plan ?? "starter") as Plan
}

export async function assertUserLimit(tenantId: string) {
  const plan = await getTenantPlan(tenantId)
  const limits = PLANS[plan].limits
  if (limits.users === Infinity) return

  const [result] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.tenantId, tenantId))

  if ((result?.total ?? 0) >= limits.users) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your ${PLANS[plan].name} plan supports up to ${limits.users} users. Upgrade to add more.`,
    })
  }
}

export async function assertProjectLimit(tenantId: string) {
  const plan = await getTenantPlan(tenantId)
  const limits = PLANS[plan].limits
  if (limits.projects === Infinity) return

  const [result] = await db
    .select({ total: count() })
    .from(projects)
    .where(
      and(
        eq(projects.tenantId, tenantId),
        sql`status NOT IN ('completed', 'cancelled')`
      )
    )

  if ((result?.total ?? 0) >= limits.projects) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your ${PLANS[plan].name} plan supports up to ${limits.projects} active projects. Upgrade or complete existing projects.`,
    })
  }
}

export async function assertAiQuoteLimit(tenantId: string) {
  const plan = await getTenantPlan(tenantId)
  const limits = PLANS[plan].limits
  if (limits.aiQuotesPerMonth === Infinity) return

  // Count AI quote jobs created this calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [result] = await db
    .select({ total: count() })
    .from(aiQuoteJobs)
    .where(
      and(
        eq(aiQuoteJobs.tenantId, tenantId),
        gte(aiQuoteJobs.createdAt, startOfMonth)
      )
    )

  if ((result?.total ?? 0) >= limits.aiQuotesPerMonth) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You've reached your ${limits.aiQuotesPerMonth} AI quote limit for this month. Upgrade for more.`,
    })
  }
}

// Feature flags by plan
export async function assertFeatureAccess(
  tenantId: string,
  feature: "content_machine" | "referrals" | "loyalty" | "marketing_automation" | "inventory" | "white_label"
) {
  const plan = await getTenantPlan(tenantId)

  const featureMap: Record<string, Plan[]> = {
    content_machine: ["growth", "enterprise"],
    referrals: ["growth", "enterprise"],
    loyalty: ["growth", "enterprise"],
    marketing_automation: ["growth", "enterprise"],
    inventory: ["growth", "enterprise"],
    white_label: ["enterprise"],
  }

  const allowedPlans = featureMap[feature] ?? []
  if (!allowedPlans.includes(plan)) {
    const minPlan = allowedPlans[0] ?? "growth"
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This feature requires the ${PLANS[minPlan].name} plan or higher.`,
    })
  }
}
