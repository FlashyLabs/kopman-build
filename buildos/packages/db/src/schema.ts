import {
  pgTable,
  pgSchema,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  varchar,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ── Enums ──────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["owner", "admin", "manager", "field", "viewer"])
export const leadStatusEnum = pgEnum("lead_status", [
  "new", "contacted", "qualified", "quoted", "won", "lost", "nurture",
])
export const projectStatusEnum = pgEnum("project_status", [
  "planning", "active", "on_hold", "completed", "cancelled",
])
export const projectTypeEnum = pgEnum("project_type", [
  "renovation", "basement", "addition", "new_build",
  "windows", "landscaping", "asphalt", "concrete", "moving", "other",
])
export const planEnum = pgEnum("plan", ["starter", "growth", "enterprise"])
export const quoteStatusEnum = pgEnum("quote_status", [
  "draft", "sent", "accepted", "declined", "expired",
])
export const expenseCategoryEnum = pgEnum("expense_category", [
  "labour", "materials", "subcontractor", "equipment", "permit", "other",
])
export const mediaTypeEnum = pgEnum("media_type", [
  "before", "after", "progress", "receipt", "document",
])
export const referralStatusEnum = pgEnum("referral_status", [
  "pending", "converted", "rewarded",
])
export const aiJobStatusEnum = pgEnum("ai_job_status", [
  "pending", "processing", "complete", "failed",
])

// ── Tenants ────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 63 }).notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  plan: planEnum("plan").notNull().default("starter"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  flashyIdClientId: text("flashy_id_client_id"),     // per-tenant FlashyID app
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    flashyId: text("flashy_id").notNull(),     // FlashyID subject (sub claim)
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    role: roleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_flashy_id_tenant_idx").on(t.flashyId, t.tenantId),
    index("users_tenant_idx").on(t.tenantId),
  ]
)

// ── Contacts ───────────────────────────────────────────────────────────────

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: varchar("phone", { length: 20 }),
    address: text("address"),
    city: text("city"),
    province: varchar("province", { length: 2 }),
    postalCode: varchar("postal_code", { length: 7 }),
    source: text("source"),
    referredById: uuid("referred_by_id"),    // self-ref populated after
    totalSpend: integer("total_spend").notNull().default(0),     // cents
    projectCount: integer("project_count").notNull().default(0),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contacts_tenant_idx").on(t.tenantId),
    index("contacts_email_tenant_idx").on(t.email, t.tenantId),
  ]
)

// ── Leads ──────────────────────────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    status: leadStatusEnum("status").notNull().default("new"),
    projectType: projectTypeEnum("project_type").notNull().default("renovation"),
    estimatedValue: integer("estimated_value"),     // cents
    address: text("address"),
    source: text("source"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("leads_tenant_idx").on(t.tenantId),
    index("leads_status_tenant_idx").on(t.status, t.tenantId),
    index("leads_contact_idx").on(t.contactId),
  ]
)

// ── Projects ───────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").notNull().references(() => contacts.id),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    type: projectTypeEnum("type").notNull().default("renovation"),
    status: projectStatusEnum("status").notNull().default("planning"),
    contractValue: integer("contract_value").notNull().default(0),   // cents
    paidToDate: integer("paid_to_date").notNull().default(0),         // cents
    address: text("address").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("projects_tenant_idx").on(t.tenantId),
    index("projects_contact_idx").on(t.contactId),
    index("projects_status_tenant_idx").on(t.status, t.tenantId),
  ]
)

// ── Project Expenses ───────────────────────────────────────────────────────

export const projectExpenses = pgTable(
  "project_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    category: expenseCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),    // cents
    date: timestamp("date", { withTimezone: true }).notNull(),
    receiptUrl: text("receipt_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("expenses_project_idx").on(t.projectId),
    index("expenses_tenant_idx").on(t.tenantId),
  ]
)

// ── Quotes ─────────────────────────────────────────────────────────────────

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    lineItems: jsonb("line_items").notNull().default(sql`'[]'::jsonb`),
    subtotal: integer("subtotal").notNull().default(0),   // cents
    tax: integer("tax").notNull().default(0),              // cents
    total: integer("total").notNull().default(0),          // cents
    status: quoteStatusEnum("status").notNull().default("draft"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    notes: text("notes"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quotes_tenant_idx").on(t.tenantId),
    index("quotes_lead_idx").on(t.leadId),
  ]
)

// ── Referrals ──────────────────────────────────────────────────────────────

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    referrerId: uuid("referrer_id").notNull().references(() => contacts.id),
    referredId: uuid("referred_id").references(() => contacts.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    status: referralStatusEnum("status").notNull().default("pending"),
    rewardAmount: integer("reward_amount").notNull().default(0),  // cents
    rewardPaidAt: timestamp("reward_paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("referrals_tenant_idx").on(t.tenantId),
    index("referrals_referrer_idx").on(t.referrerId),
  ]
)

// ── Media Assets ───────────────────────────────────────────────────────────

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    type: mediaTypeEnum("type").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    aiCaption: text("ai_caption"),
    publishedToSite: boolean("published_to_site").notNull().default(false),
    publishedToSocial: boolean("published_to_social").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("media_tenant_idx").on(t.tenantId),
    index("media_project_idx").on(t.projectId),
  ]
)

// ── AI Quote Jobs ──────────────────────────────────────────────────────────

export const aiQuoteJobs = pgTable(
  "ai_quote_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    photoUrls: text("photo_urls").array().notNull().default(sql`'{}'::text[]`),
    status: aiJobStatusEnum("status").notNull().default("pending"),
    rawVisionOutput: jsonb("raw_vision_output"),
    draftQuoteId: uuid("draft_quote_id").references(() => quotes.id, { onDelete: "set null" }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("ai_jobs_tenant_idx").on(t.tenantId),
    index("ai_jobs_status_idx").on(t.status),
  ]
)
