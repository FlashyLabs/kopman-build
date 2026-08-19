import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@/lib/auth"
import { withTenant, db } from "@buildos/db"
import { users } from "@buildos/db"
import { eq } from "drizzle-orm"
import superjson from "superjson"
import { z } from "zod"
import type { Role } from "@buildos/types"

export type Context = {
  userId: string
  tenantId: string
  role: Role
}

export async function createContext(): Promise<Context | null> {
  const session = await auth()
  if (!session?.user?.tenantId) return null

  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    role: session.user.role as Role,
  }
}

const t = initTRPC.context<Context | null>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx) throw new TRPCError({ code: "UNAUTHORIZED" })
  return next({ ctx })
})

// Require minimum role level
const ROLE_ORDER: Role[] = ["viewer", "field", "manager", "admin", "owner"]
export function requireRole(minRole: Role) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!ctx) throw new TRPCError({ code: "UNAUTHORIZED" })
    const userRank = ROLE_ORDER.indexOf(ctx.role)
    const required = ROLE_ORDER.indexOf(minRole)
    if (userRank < required) throw new TRPCError({ code: "FORBIDDEN" })
    return next({ ctx })
  })
}
