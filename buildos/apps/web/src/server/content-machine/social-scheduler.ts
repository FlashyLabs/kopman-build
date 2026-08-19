/**
 * Social Scheduler — Phase 2
 *
 * Manages queuing social posts to Instagram, Facebook, and Google Business.
 * Phase 2 uses direct API calls. Phase 3 adds a scheduling queue (BullMQ)
 * with optimal posting time selection based on per-tenant engagement data.
 *
 * Integrations:
 * - Meta Graph API (Instagram + Facebook Business)
 * - Google My Business API
 */

export interface SocialPost {
  platform: "instagram" | "facebook" | "google"
  caption: string
  imageUrls: string[]   // public R2 CDN URLs
  scheduledFor?: Date   // null = post immediately
}

export interface PostResult {
  platform: string
  externalId: string | null
  status: "published" | "scheduled" | "failed"
  error?: string
}

// ── Meta Graph API ─────────────────────────────────────────────────────────

async function postToInstagram(
  post: SocialPost,
  credentials: { igBusinessId: string; accessToken: string }
): Promise<PostResult> {
  const { igBusinessId, accessToken } = credentials

  try {
    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igBusinessId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: post.imageUrls[0],
          caption: post.caption,
          access_token: accessToken,
        }),
      }
    )
    const container = await containerRes.json()
    if (!container.id) throw new Error(JSON.stringify(container))

    // Step 2: Publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igBusinessId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: accessToken,
        }),
      }
    )
    const published = await publishRes.json()
    if (!published.id) throw new Error(JSON.stringify(published))

    return { platform: "instagram", externalId: published.id, status: "published" }
  } catch (err) {
    return {
      platform: "instagram",
      externalId: null,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function postToFacebook(
  post: SocialPost,
  credentials: { pageId: string; accessToken: string }
): Promise<PostResult> {
  const { pageId, accessToken } = credentials

  try {
    const body: Record<string, string> = {
      message: post.caption,
      access_token: accessToken,
    }
    if (post.imageUrls[0]) body.url = post.imageUrls[0]

    const endpoint = post.imageUrls[0]
      ? `https://graph.facebook.com/v21.0/${pageId}/photos`
      : `https://graph.facebook.com/v21.0/${pageId}/feed`

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.id) throw new Error(JSON.stringify(data))

    return { platform: "facebook", externalId: data.id, status: "published" }
  } catch (err) {
    return {
      platform: "facebook",
      externalId: null,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function postToGoogleBusiness(
  post: SocialPost,
  credentials: { locationId: string; accessToken: string }
): Promise<PostResult> {
  const { locationId, accessToken } = credentials

  try {
    const body: Record<string, unknown> = {
      languageCode: "en",
      summary: post.caption,
      callToAction: {
        actionType: "LEARN_MORE",
      },
    }

    if (post.imageUrls[0]) {
      body.media = [{ mediaFormat: "PHOTO", sourceUrl: post.imageUrls[0] }]
    }

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationId}/localPosts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!data.name) throw new Error(JSON.stringify(data))

    return { platform: "google", externalId: data.name, status: "published" }
  } catch (err) {
    return {
      platform: "google",
      externalId: null,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export type SocialCredentials = {
  meta?: { igBusinessId: string; fbPageId: string; accessToken: string }
  google?: { locationId: string; accessToken: string }
}

export async function publishSocialPost(
  post: SocialPost,
  credentials: SocialCredentials
): Promise<PostResult[]> {
  const results: Promise<PostResult>[] = []

  if (post.platform === "instagram" && credentials.meta) {
    results.push(
      postToInstagram(post, {
        igBusinessId: credentials.meta.igBusinessId,
        accessToken: credentials.meta.accessToken,
      })
    )
  }

  if (post.platform === "facebook" && credentials.meta) {
    results.push(
      postToFacebook(post, {
        pageId: credentials.meta.fbPageId,
        accessToken: credentials.meta.accessToken,
      })
    )
  }

  if (post.platform === "google" && credentials.google) {
    results.push(
      postToGoogleBusiness(post, credentials.google)
    )
  }

  return Promise.all(results)
}
