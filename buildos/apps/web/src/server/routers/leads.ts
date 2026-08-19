import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, leads, contacts } from "@buildos/db"
import { eq, desc, and, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

const leadInput = z.object({
  contactId: z.string().uuid().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  status: z
    .enum(["new", "contacted", "qualified", "quoted", "won", "lost", "nurture"])
    .optional(),
  projectType: z
    .enum([
      "renovation", "basement", "addition", "new_build",
      "windows", "landscaping", "asphalt", "concrete", "moving", "other",
    ])
    .optional(),
  estimatedValue: z.number().int().positive().nullable().optional(),
  address: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const leadsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["new","contacted","qualified","quoted","won","lost","nurture"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const conditions = input.status
          ? [eq(leads.status, input.status)]
          : []

        return tx
          .select()
          .from(leads)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(leads.createdAt))
          .limit(input.limit)
          .offset(input.offset)
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [lead] = await tx
          .select()
          .from(leads)
          .where(eq(leads.id, input.id))
          .limit(1)

        if (!lead) throw new TRPCError({ code: "NOT_FOUND" })
        return lead
      })
    }),

  create: requireRole("field")
    .input(leadInput)
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [lead] = await tx
          .insert(leads)
          .values({
            tenantId: ctx.tenantId,
            ...input,
            projectType: input.projectType ?? "renovation",
          })
          .returning()
        return lead
      })
    }),

  update: requireRole("field")
    .input(z.object({ id: z.string().uuid() }).merge(leadInput))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return withTenant(ctx.tenantId, async (tx) => {
        const [lead] = await tx
          .update(leads)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(leads.id, id))
          .returning()

        if (!lead) throw new TRPCError({ code: "NOT_FOUND" })
        return lead
      })
    }),

  pipeline: protectedProcedure.query(async ({ ctx }) => {
    return withTenant(ctx.tenantId, async (tx) => {
      const rows = await tx
        .select({
          status: leads.status,
          count: sql<number>`count(*)::int`,
          totalValue: sql<number>`coalesce(sum(estimated_value), 0)::int`,
        })
        .from(leads)
        .groupBy(leads.status)

      return rows
    })
  }),
})
