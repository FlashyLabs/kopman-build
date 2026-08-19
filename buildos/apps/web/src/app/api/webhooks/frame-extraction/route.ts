/**
 * Webhook receiver for the frame extraction worker service.
 * Called by the Railway worker when video frames are ready.
 * Verifies a shared secret before processing.
 */

import { NextRequest, NextResponse } from "next/server"
import { createContext } from "@/lib/trpc/server"
import { appRouter } from "@/server/root"
import { db } from "@buildos/db"
import { videoQuoteJobs } from "@buildos/db/src/schema-phase5"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret")
  if (secret !== process.env.FRAME_WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json() as {
    jobId: string
    frames: Array<{ url: string; timestampSeconds: number; label: string }>
    error?: string
  }

  // Look up tenantId from the job record (worker doesn't know it)
  const [job] = await db
    .select({ tenantId: videoQuoteJobs.tenantId })
    .from(videoQuoteJobs)
    .where(eq(videoQuoteJobs.id, body.jobId))
    .limit(1)

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  if (body.error) {
    await db
      .update(videoQuoteJobs)
      .set({ status: "failed", error: body.error, completedAt: new Date() })
      .where(eq(videoQuoteJobs.id, body.jobId))
    return NextResponse.json({ received: true })
  }

  // Build a synthetic context for the tRPC caller
  const syntheticCtx = {
    userId: "system",
    tenantId: job.tenantId,
    role: "owner" as const,
  }

  const caller = appRouter.createCaller(syntheticCtx)
  await caller.videoQuotes.onFramesReady({ jobId: body.jobId, frames: body.frames })

  return NextResponse.json({ received: true })
}
