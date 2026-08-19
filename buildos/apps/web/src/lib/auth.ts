import NextAuth from "next-auth"
import type { OAuthConfig } from "next-auth/providers"
import { db } from "@buildos/db"
import { users, tenants } from "@buildos/db"
import { eq, and } from "drizzle-orm"

// FlashyID is an OIDC-compliant OAuth 2.0 provider
// Configure via env: FLASHY_ID_ISSUER, FLASHY_ID_CLIENT_ID, FLASHY_ID_CLIENT_SECRET
function FlashyIDProvider(): OAuthConfig<Record<string, unknown>> {
  const issuer = process.env.FLASHY_ID_ISSUER!

  return {
    id: "flashyid",
    name: "FlashyID",
    type: "oidc",
    issuer,
    clientId: process.env.FLASHY_ID_CLIENT_ID!,
    clientSecret: process.env.FLASHY_ID_CLIENT_SECRET!,
    // Discovery endpoint resolves /.well-known/openid-configuration automatically
    // Override specific endpoints only if FlashyID deviates from OIDC spec
    authorization: {
      params: {
        scope: "openid email profile",
      },
    },
    profile(profile) {
      return {
        id: profile.sub as string,
        name: (profile.name as string) ?? (profile.email as string),
        email: profile.email as string,
        image: (profile.picture as string) ?? null,
      }
    },
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [FlashyIDProvider()],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false

      const flashyId = profile.sub as string
      const email = user.email!
      const name = user.name ?? email
      const avatarUrl = user.image ?? null

      // Find or create user + tenant in our DB
      // Tenant resolution: FlashyID may embed tenant claim, else derive from email domain
      const tenantClaim =
        (profile["buildos_tenant"] as string | undefined) ??
        (profile["org_id"] as string | undefined)

      let tenantId: string

      if (tenantClaim) {
        // Tenant provisioned via FlashyID org claim
        const [existing] = await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.slug, tenantClaim))
          .limit(1)

        if (!existing) {
          // Auto-provision tenant on first SSO login
          const [newTenant] = await db
            .insert(tenants)
            .values({ slug: tenantClaim, name: tenantClaim, plan: "starter" })
            .returning({ id: tenants.id })
          tenantId = newTenant.id
        } else {
          tenantId = existing.id
        }
      } else {
        // Fallback: invite-based flow, user must already exist
        const [existingUser] = await db
          .select({ tenantId: users.tenantId })
          .from(users)
          .where(eq(users.flashyId, flashyId))
          .limit(1)

        if (!existingUser) return "/auth/no-tenant"   // redirect to error page
        tenantId = existingUser.tenantId
      }

      // Upsert user record
      await db
        .insert(users)
        .values({
          tenantId,
          flashyId,
          email,
          name,
          avatarUrl,
          role: "viewer",
        })
        .onConflictDoUpdate({
          target: [users.flashyId, users.tenantId],
          set: { email, name, avatarUrl, updatedAt: new Date() },
        })

      return true
    },

    async session({ session, token }) {
      if (token.sub) {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.flashyId, token.sub))
          .limit(1)

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.tenantId = dbUser.tenantId
          session.user.role = dbUser.role
          session.user.flashyId = dbUser.flashyId
        }
      }
      return session
    },

    async jwt({ token, profile }) {
      if (profile?.sub) token.sub = profile.sub as string
      return token
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
})

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      tenantId: string
      role: string
      flashyId: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
