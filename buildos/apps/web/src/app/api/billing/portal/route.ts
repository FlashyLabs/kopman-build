import { createContext } from "@/lib/trpc/server"
import { appRouter } from "@/server/root"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const ctx = await createContext()
  if (!ctx) return NextResponse.redirect(new URL("/auth/signin", req.url))

  const caller = appRouter.createCaller(ctx)
  const { url } = await caller.billing.openPortal()

  return NextResponse.redirect(url)
}
