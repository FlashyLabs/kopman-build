import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant } from "@buildos/db"
import { inventoryItems, inventoryTransactions } from "@buildos/db/src/schema-phase2"
import { eq, desc, sql, lt, and } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

export const inventoryRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        lowStock: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const conditions = []
        if (input.category) conditions.push(eq(inventoryItems.category, input.category))
        if (input.lowStock) {
          // quantity_on_hand <= reorder_point
          conditions.push(sql`quantity_on_hand <= reorder_point`)
        }

        return tx
          .select()
          .from(inventoryItems)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(inventoryItems.name)
          .limit(input.limit)
          .offset(input.offset)
      })
    }),

  lowStockAlerts: protectedProcedure.query(async ({ ctx }) => {
    return withTenant(ctx.tenantId, async (tx) => {
      return tx
        .select()
        .from(inventoryItems)
        .where(sql`quantity_on_hand <= reorder_point AND reorder_point > 0`)
        .orderBy(sql`quantity_on_hand / nullif(reorder_point, 0)`) // most critical first
    })
  }),

  create: requireRole("manager")
    .input(
      z.object({
        sku: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().min(1),
        quantityOnHand: z.number().min(0).default(0),
        reorderPoint: z.number().min(0).default(0),
        reorderQuantity: z.number().min(0).default(0),
        costPerUnit: z.number().int().min(0).default(0),
        supplier: z.string().optional(),
        supplierSku: z.string().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [item] = await tx
          .insert(inventoryItems)
          .values({ tenantId: ctx.tenantId, ...input })
          .returning()
        return item
      })
    }),

  // Record stock movement (in, out, adjustment)
  recordTransaction: requireRole("field")
    .input(
      z.object({
        itemId: z.string().uuid(),
        type: z.enum(["in", "out", "adjustment", "order"]),
        quantity: z.number().positive(),
        projectId: z.string().uuid().optional(),
        unitCost: z.number().int().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [item] = await tx
          .select({ id: inventoryItems.id, quantityOnHand: inventoryItems.quantityOnHand })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, input.itemId))
          .limit(1)

        if (!item) throw new TRPCError({ code: "NOT_FOUND" })

        const delta =
          input.type === "out" ? -input.quantity :
          input.type === "adjustment" ? input.quantity - item.quantityOnHand :
          input.quantity  // "in" or "order"

        const newQty = item.quantityOnHand + delta
        if (newQty < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient stock" })
        }

        const [tx1] = await tx
          .insert(inventoryTransactions)
          .values({
            tenantId: ctx.tenantId,
            itemId: input.itemId,
            projectId: input.projectId ?? null,
            userId: ctx.userId,
            type: input.type,
            quantity: input.type === "adjustment" ? delta : input.quantity,
            unitCost: input.unitCost ?? null,
            notes: input.notes ?? null,
          })
          .returning()

        await tx
          .update(inventoryItems)
          .set({ quantityOnHand: newQty, updatedAt: new Date() })
          .where(eq(inventoryItems.id, input.itemId))

        return { transaction: tx1, newQuantityOnHand: newQty }
      })
    }),

  // AI-powered: suggest reorder quantities based on recent project usage
  suggestReorders: requireRole("manager").query(async ({ ctx }) => {
    return withTenant(ctx.tenantId, async (tx) => {
      // Items below reorder point with a reorder quantity set
      const alerts = await tx
        .select()
        .from(inventoryItems)
        .where(
          and(
            sql`quantity_on_hand <= reorder_point`,
            sql`reorder_quantity > 0`
          )
        )

      return alerts.map((item) => ({
        ...item,
        suggestedOrderQuantity: item.reorderQuantity,
        estimatedCost: Math.round(item.reorderQuantity * item.costPerUnit),
      }))
    })
  }),

  transactions: protectedProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(inventoryTransactions)
          .where(eq(inventoryTransactions.itemId, input.itemId))
          .orderBy(desc(inventoryTransactions.createdAt))
          .limit(input.limit)
      })
    }),
})
