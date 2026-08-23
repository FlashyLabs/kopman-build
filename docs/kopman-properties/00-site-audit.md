# KOPMAN BUILD / BUILDOS — TECHNICAL AUDIT (2026-08-23)

## Repo state
- `flashylabs/kopman-build` and `flashylabs/buildos` are BYTE-IDENTICAL mirrors (same HEAD f78aabb, same tree).
- Structure: `site/` = 630 static HTML dirs (zero-build); `buildos/` = pnpm/turbo monorepo (Next.js + Drizzle + tRPC + Stripe + NextAuth).
- Design: single self-contained HTML, no framework, Instrument Serif + Geist + Geist Mono, linen/near-black palette.

## SEV-1 — Contact form silently discards every lead
site/index.html:2096 — "PLACEHOLDER SUBMIT". Handler awaits `setTimeout(700)` then prints
"Thank you — your inquiry has been received." No fetch, no endpoint, no storage.
Every inquiry since launch is lost. Only real contact path is a mailto: link.

## SEV-1 — 574 of 630 pages are orphaned
Only 56 unique internal link targets exist across the whole estate.
574 pages are in sitemap.xml but have zero inbound internal links → crawl-starved, no PageRank flow.

## SEV-1 — ~98.2% duplicate content across location pages
Diff of basement-renovation-scarborough vs -brampton after normalising the city token:
398 content lines, only 14 differ (7 line-pairs). Unique per page = one descriptor sentence,
one FAQ sentence, and the schema areaServed array. Word counts: 2326/2327/2328/2329.
This is the shape Google's scaled-content-abuse policy targets. 600 pages of it.

## SEV-2 — 60 sitemap URLs are 404
sitemap.xml lists 690 unique slugs; 630 exist on disk. All 60 missing are /blog/* posts.

## SEV-2 — Placeholder identity data live in production
- schema.org telephone: "+1-000-000-0000"
- Contact block: "Dubai — Address forthcoming / +971 0 000 0000"; also New York, London, Singapore
- Positioning conflict: 4 fictional global offices on a firm marketed as GTA + Muskoka.
- README concedes the by-the-numbers strip (320+ projects, 9.4M sqft, 98% on-time) and the
  press row (Architectural Record, WSJ, Dezeen, FT, Wallpaper*, Robb Report) are illustrative.
  These are live on a site about to front an institutional properties arm.

## SEV-2 — og.jpg does not exist
All 630 pages reference https://kopmanbuild.com/og.jpg. No image assets in site/ at all.
Every social/LLM-surface share renders blank.

## SEV-3 — Schema + measurement gaps
- 590/630 pages missing BreadcrumbList (94%)
- 280/630 missing FAQPage (44%)
- 0/630 have any analytics tag. No GA4, GTM, Plausible, PostHog. Zero attribution.
- Canonicals: 630/630 present (only clean pass)

## BuildOS app
- 19 tables across schema.ts (10) / schema-phase2.ts (4) / schema-phase5.ts (5)
- 17 tRPC routers: ai, billing, contacts, content, intelligence, inventory, leads, loyalty,
  marketing, marketplace, media, onboarding, projects, quotes, referrals, video-quotes, white-label
- Integrations wired: Stripe (+Connect), NextAuth via FlashyID OIDC, Resend, Meta Graph, Google GBP
- No secrets committed (clean scan). `.env.example` + `.env.vercel` present, no live keys.
- No public marketing surface — app/ has only (dashboard), api, auth, onboarding.
- Deps not installed in this container; typecheck not run.

## Strategic read
The construction arm's demand engine is a well-built shell with the wiring cut: no lead capture,
no analytics, no crawl paths, and a content estate that is legally-thin at scale. Before
kopman.group and kopman.properties inherit this stack, the ring architecture has to be built on
a fixed foundation — otherwise the new domains inherit the same three SEV-1s.
