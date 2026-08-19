import { auth } from "@/lib/auth"
import { createContext } from "@/lib/trpc/server"
import { appRouter } from "@/server/root"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const ctx = await createContext()
  if (!ctx) return NextResponse.redirect(new URL("/auth/signin", req.url))

  const plan = req.nextUrl.searchParams.get("plan") as "starter" | "growth" | "enterprise"
  if (!["starter", "growth", "enterprise"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const caller = appRouter.createCaller(ctx)
  const { url } = await caller.billing.startCheckout({ plan })

  return NextResponse.redirect(url)
}
