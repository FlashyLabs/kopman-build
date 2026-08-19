/**
 * Phase 5 schema — Marketplace + Video quote jobs + White-label
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  varchar,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants, leads } from "./schema"

// ── Marketplace ────────────────────────────────────────────────────────────

export const marketplaceStatusEnum = pgEnum("marketplace_status", [
  "draft", "active", "paused", "suspended",
])

// A tenant's public marketplace profile (visible to lead buyers)
export const marketplaceProfiles = pgTable("marketplace_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique().references(() => tenants.id, { onDelete: "cascade" }),
  status: marketplaceStatusEnum("status").notNull().default("draft"),
  displayName: text("display_name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  serviceTypes: text("service_types").array().notNull().default(sql`'{}'::text[]`),
  serviceAreas: text("service_areas").array().notNull().default(sql`'{}'::text[]`),   // city/neighbourhood slugs
  avgRating: real("avg_rating"),
  reviewCount: integer("review_count").notNull().default(0),
  projectsCompleted: integer("projects_completed").notNull().default(0),
  leadPriceFloor: integer("lead_price_floor").notNull().default(2500),   // cents — min price to buy a lead
  acceptingLeads: boolean("accepting_leads").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const leadRouteStatusEnum = pgEnum("lead_route_status", [
  "available",     // listed on marketplace
  "claimed",       // bought by a tenant
  "closed",        // won/lost — no longer available
  "expired",       // nobody bought it within TTL
])

// A lead listed on the marketplace (can come from the public quote form or transferred from a tenant)
export const marketplaceLeads = pgTable(
  "marketplace_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originTenantId: uuid("origin_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    claimedByTenantId: uuid("claimed_by_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    status: leadRouteStatusEnum("status").notNull().default("available"),
    projectType: text("project_type").notNull(),
    city: text("city").notNull(),
    neighbourhood: text("neighbourhood"),
    estimatedValue: integer("estimated_value"),    // cents
    summary: text("summary"),                      // AI-generated, no PII
    photoUrls: text("photo_urls").array().notNull().default(sql`'{}'::text[]`),
    listPrice: integer("list_price").notNull(),    // cents — what buyer pays
    commissionRate: real("commission_rate").notNull().default(0.10),  // 10% platform fee
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    contactReleasedAt: timestamp("contact_released_at", { withTimezone: true }),  // after claim + payment
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mp_leads_status_idx").on(t.status),
    index("mp_leads_city_type_idx").on(t.city, t.projectType),
  ]
)

// Tracks which tenant bought a marketplace lead + payment record
export const leadPurchases = pgTable(
  "lead_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketplaceLeadId: uuid("marketplace_lead_id").notNull().references(() => marketplaceLeads.id),
    buyerTenantId: uuid("buyer_tenant_id").notNull().references(() => tenants.id),
    pricePaidCents: integer("price_paid_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    status: text("status").notNull().default("pending"),  // pending|paid|refunded
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("lp_buyer_idx").on(t.buyerTenantId),
    index("lp_lead_idx").on(t.marketplaceLeadId),
  ]
)

// ── Video Quote Jobs ───────────────────────────────────────────────────────

export const videoJobStatusEnum = pgEnum("video_job_status", [
  "pending", "uploading", "extracting", "analyzing", "complete", "failed",
])

export const videoQuoteJobs = pgTable(
  "video_quote_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    videoUrl: text("video_url").notNull(),
    status: videoJobStatusEnum("status").notNull().default("pending"),
    extractedFrameUrls: text("extracted_frame_urls").array().notNull().default(sql`'{}'::text[]`),
    frameCount: integer("frame_count").notNull().default(0),
    rawAnalysisOutput: jsonb("raw_analysis_output"),
    draftQuoteId: uuid("draft_quote_id"),
    workerJobId: text("worker_job_id"),    // Railway / AWS Batch job ID
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("video_jobs_tenant_idx").on(t.tenantId),
    index("video_jobs_status_idx").on(t.status),
  ]
)

// ── White-label config (Enterprise plan) ──────────────────────────────────

export const whitelabelConfigs = pgTable("whitelabel_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique().references(() => tenants.id, { onDelete: "cascade" }),
  customDomain: text("custom_domain"),           // e.g. "app.acme-construction.ca"
  brandName: text("brand_name").notNull(),
  primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#14B8A6"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  supportEmail: text("support_email"),
  hideBuiltWith: boolean("hide_built_with").notNull().default(false),
  customCss: text("custom_css"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
