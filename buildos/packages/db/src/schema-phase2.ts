/**
 * Phase 2 & 3 schema additions
 * Run as a separate migration after 0000_rls_setup.sql
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
  index,
  real,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants, projects, users } from "./schema"

// ── Content Pieces (case studies, FAQs, social posts) ─────────────────────

export const contentTypeEnum = pgEnum("content_type", [
  "case_study", "faq", "social_instagram", "social_facebook", "social_google",
])

export const contentPieces = pgTable(
  "content_pieces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    type: contentTypeEnum("type").notNull(),
    title: text("title"),
    slug: text("slug"),
    body: text("body").notNull(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    externalId: text("external_id"),       // platform post ID after publish
    aiGenerated: boolean("ai_generated").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("content_tenant_idx").on(t.tenantId),
    index("content_project_idx").on(t.projectId),
    index("content_type_idx").on(t.type),
  ]
)

// ── Inventory ──────────────────────────────────────────────────────────────

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 64 }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),          // lumber, hardware, fixtures, tools, etc.
    unit: text("unit").notNull(),        // each, sq ft, lf, box, pail
    quantityOnHand: real("quantity_on_hand").notNull().default(0),
    reorderPoint: real("reorder_point").notNull().default(0),
    reorderQuantity: real("reorder_quantity").notNull().default(0),
    costPerUnit: integer("cost_per_unit").notNull().default(0),   // cents
    supplier: text("supplier"),
    supplierSku: text("supplier_sku"),
    location: text("location"),          // warehouse shelf, van, site
    lastOrderedAt: timestamp("last_ordered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_tenant_idx").on(t.tenantId),
    index("inventory_category_idx").on(t.category),
  ]
)

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),       // "in" | "out" | "adjustment" | "order"
    quantity: real("quantity").notNull(),
    unitCost: integer("unit_cost"),     // cents, recorded at time of transaction
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inv_tx_tenant_idx").on(t.tenantId),
    index("inv_tx_item_idx").on(t.itemId),
    index("inv_tx_project_idx").on(t.projectId),
  ]
)

// ── Tenant Settings ────────────────────────────────────────────────────────

export const tenantSettings = pgTable("tenant_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().unique().references(() => tenants.id, { onDelete: "cascade" }),
  // Social credentials (encrypted at rest — use Vault in prod)
  metaIgBusinessId: text("meta_ig_business_id"),
  metaFbPageId: text("meta_fb_page_id"),
  metaAccessToken: text("meta_access_token"),
  googleLocationId: text("google_location_id"),
  googleAccessToken: text("google_access_token"),
  // Loyalty config
  referralRewardTiers: jsonb("referral_reward_tiers").default(sql`'[]'::jsonb`),
  pointsPerHundredDollars: integer("points_per_hundred_dollars").notNull().default(1),
  // Notification prefs
  notifyOnNewLead: boolean("notify_on_new_lead").notNull().default(true),
  notifyOnQuoteAccepted: boolean("notify_on_quote_accepted").notNull().default(true),
  // Branding
  brandColor: varchar("brand_color", { length: 7 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
