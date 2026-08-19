import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, quotes, leads, contacts } from "@buildos/db"
import { eq, desc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { sendQuoteEmail } from "@/server/email/templates"

const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().int().min(0),
  total: z.number().int().min(0),
})

export const quotesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid().optional(),
        status: z.enum(["draft","sent","accepted","declined","expired"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select()
          .from(quotes)
          .where(input.leadId ? eq(quotes.leadId, input.leadId) : undefined)
          .orderBy(desc(quotes.createdAt))
          .limit(input.limit)
          .offset(input.offset)
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [quote] = await tx
          .select()
          .from(quotes)
          .where(eq(quotes.id, input.id))
          .limit(1)

        if (!quote) throw new TRPCError({ code: "NOT_FOUND" })
        return quote
      })
    }),

  update: requireRole("field")
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        lineItems: z.array(lineItemSchema).optional(),
        subtotal: z.number().int().min(0).optional(),
        tax: z.number().int().min(0).optional(),
        total: z.number().int().min(0).optional(),
        notes: z.string().nullable().optional(),
        validUntil: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return withTenant(ctx.tenantId, async (tx) => {
        const [quote] = await tx
          .update(quotes)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(quotes.id, id))
          .returning()

        if (!quote) throw new TRPCError({ code: "NOT_FOUND" })
        return quote
      })
    }),

  // Send quote to contact via email and mark as "sent"
  send: requireRole("field")
    .input(
      z.object({
        id: z.string().uuid(),
        quoteUrl: z.string().url(),  // public shareable URL
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [quote] = await tx
          .select()
          .from(quotes)
          .where(eq(quotes.id, input.id))
          .limit(1)

        if (!quote) throw new TRPCError({ code: "NOT_FOUND" })
        if (quote.status !== "draft") {
          throw new TRPCError({ code: "CONFLICT", message: "Quote already sent" })
        }

        // Get contact email
        let email: string | null = null
        let contactName = "there"
        if (quote.contactId) {
          const [contact] = await tx
            .select({ email: contacts.email, firstName: contacts.firstName })
            .from(contacts)
            .where(eq(contacts.id, quote.contactId))
            .limit(1)
          email = contact?.email ?? null
          contactName = contact?.firstName ?? "there"
        }

        if (!email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Contact has no email address",
          })
        }

        await sendQuoteEmail({
          to: email,
          contactName,
          quoteTitle: quote.title,
          total: quote.total,
          quoteUrl: input.quoteUrl,
          validUntil: quote.validUntil
            ? new Intl.DateTimeFormat("en-CA", { dateStyle: "long" }).format(quote.validUntil)
            : "30 days from today",
        })

        const [updated] = await tx
          .update(quotes)
          .set({ status: "sent", updatedAt: new Date() })
          .where(eq(quotes.id, input.id))
          .returning()

        return updated
      })
    }),

  updateStatus: requireRole("manager")
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["accepted", "declined", "expired"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [quote] = await tx
          .update(quotes)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(quotes.id, input.id))
          .returning()

        if (!quote) throw new TRPCError({ code: "NOT_FOUND" })

        // If accepted, update linked lead status to "won"
        if (input.status === "accepted") {
          await tx
            .update(leads)
            .set({ status: "won", updatedAt: new Date() })
            .where(eq(leads.id, quote.leadId))
        }

        return quote
      })
    }),
})
