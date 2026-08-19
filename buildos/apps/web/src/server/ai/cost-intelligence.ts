/**
 * Cost Intelligence Engine — Phase 5
 *
 * Learns from historical project data to:
 * 1. Improve quote accuracy over time per project type + neighbourhood
 * 2. Flag quotes that deviate significantly from historical averages
 * 3. Surface margin trends per project type
 * 4. Generate "should cost" benchmarks for the sales team
 */

import Anthropic from "@anthropic-ai/sdk"
import { db, projects, projectExpenses, quotes } from "@buildos/db"
import { eq, and, gte, sql, avg, count } from "drizzle-orm"

const anthropic = new Anthropic()

export interface CostBenchmark {
  projectType: string
  avgContractValue: number      // cents
  avgExpenses: number           // cents
  avgMarginPct: number
  sampleSize: number
  p25ContractValue: number      // cents
  p75ContractValue: number      // cents
}

export interface QuoteAudit {
  quoteId: string
  totalCents: number
  benchmark: CostBenchmark | null
  deviation: number | null       // % above/below benchmark avg
  flag: "high" | "low" | "normal" | "insufficient_data"
  recommendation: string
}

// Pull historical benchmarks for a given project type within a tenant
export async function getProjectBenchmarks(
  tenantId: string,
  projectType: string
): Promise<CostBenchmark | null> {
  const rows = await db.execute(sql`
    SELECT
      p.type                                           AS project_type,
      COUNT(p.id)                                      AS sample_size,
      AVG(p.contract_value)::int                       AS avg_contract_value,
      AVG(exp.total_expenses)::int                     AS avg_expenses,
      ROUND(
        AVG(
          CASE WHEN p.contract_value > 0
               THEN 100.0 * (p.contract_value - COALESCE(exp.total_expenses,0)) / p.contract_value
               ELSE NULL END
        ), 1
      )::float                                         AS avg_margin_pct,
      PERCENTILE_CONT(0.25) WITHIN GROUP
        (ORDER BY p.contract_value)::int               AS p25_contract_value,
      PERCENTILE_CONT(0.75) WITHIN GROUP
        (ORDER BY p.contract_value)::int               AS p75_contract_value
    FROM projects p
    LEFT JOIN (
      SELECT project_id, SUM(amount) AS total_expenses
      FROM project_expenses
      WHERE tenant_id = ${tenantId}
      GROUP BY project_id
    ) exp ON exp.project_id = p.id
    WHERE p.tenant_id = ${tenantId}
      AND p.type = ${projectType}
      AND p.status = 'completed'
      AND p.contract_value > 0
    GROUP BY p.type
  `)

  const row = rows.rows[0] as Record<string, unknown> | undefined
  if (!row || Number(row.sample_size) < 3) return null  // need at least 3 data points

  return {
    projectType: row.project_type as string,
    avgContractValue: Number(row.avg_contract_value),
    avgExpenses: Number(row.avg_expenses) || 0,
    avgMarginPct: Number(row.avg_margin_pct) || 0,
    sampleSize: Number(row.sample_size),
    p25ContractValue: Number(row.p25_contract_value),
    p75ContractValue: Number(row.p75_contract_value),
  }
}

// Audit a quote against historical benchmarks
export async function auditQuote(
  tenantId: string,
  quoteId: string,
  projectType: string,
  totalCents: number
): Promise<QuoteAudit> {
  const benchmark = await getProjectBenchmarks(tenantId, projectType)

  if (!benchmark) {
    return {
      quoteId,
      totalCents,
      benchmark: null,
      deviation: null,
      flag: "insufficient_data",
      recommendation: "Not enough historical data for this project type yet. Quote on judgment.",
    }
  }

  const deviation = Math.round(
    ((totalCents - benchmark.avgContractValue) / benchmark.avgContractValue) * 100
  )

  const flag: QuoteAudit["flag"] =
    deviation > 40 ? "high" :
    deviation < -40 ? "low" :
    "normal"

  const recommendation =
    flag === "high"
      ? `This quote is ${deviation}% above your typical ${projectType} average ($${(benchmark.avgContractValue / 100).toLocaleString("en-CA")}). Double-check scope — or confirm premium materials justify the premium.`
      : flag === "low"
      ? `This quote is ${Math.abs(deviation)}% below your typical ${projectType} average. Review labour rates and ensure all scope items are included.`
      : `Quote is within normal range for your ${benchmark.sampleSize} historical ${projectType} projects.`

  return { quoteId, totalCents, benchmark, deviation, flag, recommendation }
}

// AI-powered margin analysis — natural language summary for the owner
export async function generateMarginReport(
  tenantId: string,
  periodMonths = 6
): Promise<string> {
  const since = new Date()
  since.setMonth(since.getMonth() - periodMonths)

  const rows = await db.execute(sql`
    SELECT
      p.type,
      COUNT(p.id)                                         AS count,
      SUM(p.contract_value)::int                          AS total_revenue,
      SUM(COALESCE(exp.total_expenses,0))::int            AS total_expenses,
      ROUND(
        100.0 * (SUM(p.contract_value) - SUM(COALESCE(exp.total_expenses,0)))
        / NULLIF(SUM(p.contract_value), 0), 1
      )::float                                            AS margin_pct
    FROM projects p
    LEFT JOIN (
      SELECT project_id, SUM(amount) AS total_expenses
      FROM project_expenses
      WHERE tenant_id = ${tenantId}
      GROUP BY project_id
    ) exp ON exp.project_id = p.id
    WHERE p.tenant_id = ${tenantId}
      AND p.status = 'completed'
      AND p.created_at >= ${since.toISOString()}
    GROUP BY p.type
    ORDER BY total_revenue DESC
  `)

  if (rows.rows.length === 0) {
    return "No completed projects in this period to analyze."
  }

  const tableText = rows.rows
    .map((r: any) =>
      `${r.type}: ${r.count} projects, $${(r.total_revenue / 100).toLocaleString("en-CA")} revenue, ${r.margin_pct}% margin`
    )
    .join("\n")

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a construction business analyst. Write a 3-4 sentence executive summary of this margin report for the past ${periodMonths} months. Be specific and actionable — call out the best and worst performing project types and suggest one action to improve overall margin.

Data:
${tableText}`,
      },
    ],
  })

  return response.content[0].type === "text" ? response.content[0].text.trim() : ""
}
