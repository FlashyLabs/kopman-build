import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import {
  getProjectBenchmarks,
  auditQuote,
  generateMarginReport,
} from "@/server/ai/cost-intelligence"

export const intelligenceRouter = router({
  // Get cost benchmarks for a project type
  benchmarks: protectedProcedure
    .input(
      z.object({
        projectType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getProjectBenchmarks(ctx.tenantId, input.projectType)
    }),

  // Audit a quote against historical data
  auditQuote: requireRole("field")
    .input(
      z.object({
        quoteId: z.string().uuid(),
        projectType: z.string(),
        totalCents: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      return auditQuote(ctx.tenantId, input.quoteId, input.projectType, input.totalCents)
    }),

  // AI margin report — natural language summary
  marginReport: requireRole("manager")
    .input(
      z.object({
        periodMonths: z.number().int().min(1).max(24).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const summary = await generateMarginReport(ctx.tenantId, input.periodMonths)
      return { summary, periodMonths: input.periodMonths }
    }),
})
