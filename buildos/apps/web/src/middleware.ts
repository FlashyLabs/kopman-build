import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/auth", "/api/auth", "/api/trpc"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!isPublic && !req.auth) {
    const signIn = new URL("/auth/signin", req.url)
    signIn.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(signIn)
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
