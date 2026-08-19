import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, projects, projectExpenses, contacts, mediaAssets } from "@buildos/db"
import { eq, desc, sql, and } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

const projectInput = z.object({
  contactId: z.string().uuid(),
  leadId: z.string().uuid().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  type: z
    .enum([
      "renovation", "basement", "addition", "new_build",
      "windows", "landscaping", "asphalt", "concrete", "moving", "other",
    ])
    .optional(),
  status: z
    .enum(["planning", "active", "on_hold", "completed", "cancelled"])
    .optional(),
  contractValue: z.number().int().min(0).optional(),
  address: z.string().min(1),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const projectsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["planning", "active", "on_hold", "completed", "cancelled"])
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(projects)
          .where(input.status ? eq(projects.status, input.status) : undefined)
          .orderBy(desc(projects.updatedAt))
          .limit(input.limit)
          .offset(input.offset)
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [project] = await tx
          .select()
          .from(projects)
          .where(eq(projects.id, input.id))
          .limit(1)

        if (!project) throw new TRPCError({ code: "NOT_FOUND" })
        return project
      })
    }),

  create: requireRole("manager")
    .input(projectInput)
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [project] = await tx
          .insert(projects)
          .values({
            tenantId: ctx.tenantId,
            ...input,
            type: input.type ?? "renovation",
            status: input.status ?? "planning",
            contractValue: input.contractValue ?? 0,
          })
          .returning()

        // Increment contact project count
        await tx
          .update(contacts)
          .set({
            projectCount: sql`project_count + 1`,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.contactId))

        return project
      })
    }),

  update: requireRole("field")
    .input(z.object({ id: z.string().uuid() }).merge(projectInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return withTenant(ctx.tenantId, async (tx) => {
        const [project] = await tx
          .update(projects)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(projects.id, id))
          .returning()

        if (!project) throw new TRPCError({ code: "NOT_FOUND" })
        return project
      })
    }),

  addExpense: requireRole("field")
    .input(
      z.object({
        projectId: z.string().uuid(),
        category: z.enum(["labour","materials","subcontractor","equipment","permit","other"]),
        description: z.string().min(1),
        amount: z.number().int().positive(),   // cents
        date: z.date(),
        receiptUrl: z.string().url().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [expense] = await tx
          .insert(projectExpenses)
          .values({ tenantId: ctx.tenantId, ...input })
          .returning()
        return expense
      })
    }),

  expenses: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(projectExpenses)
          .where(eq(projectExpenses.projectId, input.projectId))
          .orderBy(desc(projectExpenses.date))
      })
    }),

  financialSummary: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [project] = await tx
          .select({ contractValue: projects.contractValue, paidToDate: projects.paidToDate })
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1)

        if (!project) throw new TRPCError({ code: "NOT_FOUND" })

        const [expenseSummary] = await tx
          .select({
            totalExpenses: sql<number>`coalesce(sum(amount), 0)::int`,
          })
          .from(projectExpenses)
          .where(eq(projectExpenses.projectId, input.projectId))

        const totalExpenses = expenseSummary?.totalExpenses ?? 0
        const grossMargin = project.contractValue - totalExpenses
        const marginPct =
          project.contractValue > 0
            ? Math.round((grossMargin / project.contractValue) * 100)
            : 0

        return {
          contractValue: project.contractValue,
          paidToDate: project.paidToDate,
          totalExpenses,
          grossMargin,
          marginPct,
          outstanding: project.contractValue - project.paidToDate,
        }
      })
    }),

  dashboard: protectedProcedure.query(async ({ ctx }) => {
    return withTenant(ctx.tenantId, async (tx) => {
      const [stats] = await tx
        .select({
          active: sql<number>`count(*) filter (where status = 'active')::int`,
          planning: sql<number>`count(*) filter (where status = 'planning')::int`,
          completed: sql<number>`count(*) filter (where status = 'completed')::int`,
          totalContractValue: sql<number>`coalesce(sum(contract_value), 0)::int`,
          totalPaid: sql<number>`coalesce(sum(paid_to_date), 0)::int`,
        })
        .from(projects)

      return stats
    })
  }),
})
