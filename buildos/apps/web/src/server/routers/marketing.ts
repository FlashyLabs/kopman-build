import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, contacts, leads } from "@buildos/db"
import { eq, and, desc, inArray, sql, isNull, lte } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { sendNurtureEmail, sendProjectCompleteEmail } from "@/server/email/templates"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

export const marketingRouter = router({
  // Send nurture sequence to a lead (field staff or automated trigger)
  sendNurture: requireRole("field")
    .input(
      z.object({
        contactId: z.string().uuid(),
        step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .select({ email: contacts.email, firstName: contacts.firstName })
          .from(contacts)
          .where(eq(contacts.id, input.contactId))
          .limit(1)

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" })
        if (!contact.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Contact has no email" })

        await sendNurtureEmail({
          to: contact.email,
          contactName: contact.firstName,
          sequenceStep: input.step,
        })

        return { sent: true }
      })
    }),

  // Trigger post-completion email + review request
  triggerCompletionSequence: requireRole("manager")
    .input(
      z.object({
        contactId: z.string().uuid(),
        projectTitle: z.string(),
        reviewLink: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .select({ email: contacts.email, firstName: contacts.firstName })
          .from(contacts)
          .where(eq(contacts.id, input.contactId))
          .limit(1)

        if (!contact?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Contact has no email" })

        await sendProjectCompleteEmail({
          to: contact.email,
          contactName: contact.firstName,
          projectTitle: input.projectTitle,
          reviewLink: input.reviewLink,
        })

        return { sent: true }
      })
    }),

  // AI-generated personalised win-back for a lost or stale lead
  generateWinBackMessage: requireRole("manager")
    .input(
      z.object({
        leadId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [lead] = await tx
          .select()
          .from(leads)
          .where(eq(leads.id, input.leadId))
          .limit(1)

        if (!lead) throw new TRPCError({ code: "NOT_FOUND" })

        let contactContext = ""
        if (lead.contactId) {
          const [contact] = await tx
            .select({ firstName: contacts.firstName, city: contacts.city, projectCount: contacts.projectCount })
            .from(contacts)
            .where(eq(contacts.id, lead.contactId))
            .limit(1)

          if (contact) {
            contactContext = `Customer: ${contact.firstName}, City: ${contact.city ?? "Toronto"}, Previous projects: ${contact.projectCount}`
          }
        }

        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: `Write a short, friendly, personalized win-back email for a renovation lead that went cold.

Lead context:
- Project type: ${lead.projectType}
- Address: ${lead.address ?? "Toronto"}
- Estimated value: ${lead.estimatedValue ? `$${(lead.estimatedValue / 100).toLocaleString("en-CA")}` : "unknown"}
- Notes: ${lead.notes ?? "none"}
- Source: ${lead.source ?? "unknown"}
${contactContext}

Write a subject line and email body. Keep the body under 100 words. Warm, direct, no fluff. Don't mention the quote amount. Offer a free site visit or updated estimate.

Return as JSON: {"subject": "...", "body": "..."}`,
            },
          ],
        })

        const text = response.content[0].type === "text" ? response.content[0].text : ""
        const json = JSON.parse(text.match(/\{[\s\S]*\}/)![0])
        return json as { subject: string; body: string }
      })
    }),

  // Segment contacts for a campaign: repeat buyers, high-value, inactive
  getSegment: requireRole("manager")
    .input(
      z.object({
        segment: z.enum([
          "repeat_buyers",
          "high_value",
          "inactive_6m",
          "nurture_leads",
          "loyalty_tier_gold",
        ]),
        limit: z.number().int().min(1).max(200).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)

        switch (input.segment) {
          case "repeat_buyers":
            return tx
              .select()
              .from(contacts)
              .where(sql`project_count >= 2`)
              .limit(input.limit)

          case "high_value":
            return tx
              .select()
              .from(contacts)
              .where(sql`total_spend >= 5000000`)  // $50k+
              .orderBy(desc(contacts.totalSpend))
              .limit(input.limit)

          case "inactive_6m":
            return tx
              .select()
              .from(contacts)
              .where(
                and(
                  sql`project_count >= 1`,
                  lte(contacts.updatedAt, sixMonthsAgo)
                )
              )
              .limit(input.limit)

          case "nurture_leads":
            return tx
              .select({ contactId: leads.contactId, status: leads.status })
              .from(leads)
              .where(inArray(leads.status, ["contacted", "qualified"]))
              .limit(input.limit)

          case "loyalty_tier_gold":
            return tx
              .select()
              .from(contacts)
              .where(sql`loyalty_points >= 1000`)
              .orderBy(desc(contacts.loyaltyPoints))
              .limit(input.limit)

          default:
            return []
        }
      })
    }),
})
