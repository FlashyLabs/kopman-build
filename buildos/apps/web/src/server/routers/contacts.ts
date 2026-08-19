import { z } from "zod"
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server"
import { withTenant, contacts, referrals, projects } from "@buildos/db"
import { eq, desc, ilike, or, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

const contactInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().length(2).nullable().optional(),
  postalCode: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  referredById: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
})

export const contactsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const query = tx
          .select()
          .from(contacts)
          .orderBy(desc(contacts.updatedAt))
          .limit(input.limit)
          .offset(input.offset)

        if (input.search) {
          const term = `%${input.search}%`
          query.where(
            or(
              ilike(contacts.firstName, term),
              ilike(contacts.lastName, term),
              ilike(contacts.email, term),
              ilike(contacts.phone, term)
            )
          )
        }

        return query
      })
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .select()
          .from(contacts)
          .where(eq(contacts.id, input.id))
          .limit(1)

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" })
        return contact
      })
    }),

  create: requireRole("field")
    .input(contactInput)
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .insert(contacts)
          .values({ tenantId: ctx.tenantId, ...input })
          .returning()
        return contact
      })
    }),

  update: requireRole("field")
    .input(z.object({ id: z.string().uuid() }).merge(contactInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .update(contacts)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(contacts.id, id))
          .returning()

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" })
        return contact
      })
    }),

  addLoyaltyPoints: requireRole("manager")
    .input(z.object({ id: z.string().uuid(), points: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        const [contact] = await tx
          .update(contacts)
          .set({
            loyaltyPoints: sql`loyalty_points + ${input.points}`,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, input.id))
          .returning()

        if (!contact) throw new TRPCError({ code: "NOT_FOUND" })
        return contact
      })
    }),

  topReferrers: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      return withTenant(ctx.tenantId, async (tx) => {
        return tx
          .select({
            contact: contacts,
            referralCount: sql<number>`count(referrals.id)::int`,
          })
          .from(contacts)
          .leftJoin(referrals, eq(referrals.referrerId, contacts.id))
          .groupBy(contacts.id)
          .orderBy(desc(sql`count(referrals.id)`))
          .limit(input.limit)
      })
    }),
})
