# Handoff: Kopman Build — Marketing Site

A premium single-page marketing site for **Kopman Build** (kopmanbuild.com) — a high-end construction / development firm, **founded 1999**, positioned as a globally-trusted institutional builder.

> **This bundle ships v2 of the design** — with the custom architectural K monogram, Est. 1999 lockup, by-the-numbers strip, global offices, and recognition row already integrated. See *"What's new in v2"* below.

## What's in this bundle

```
design_handoff_kopman_build/
├── README.md          ← you are here — design spec
├── DEPLOY.md          ← step-by-step deploy instructions for Claude Code
└── site/
    └── index.html     ← the actual site (production-ready, zero-build, zero-deps)
```

## What's new in v2

- **Logo**: custom architectural K monogram (solid vertical column + two filled wedges) as an inline SVG — lives in `.brand .mark`. Footer renders a 48px version of the same mark.
- **Brand lockup**: mark · wordmark · mono badge reading *"Est. 1999 / Build · No. 001"*. Badge hides below 1180px so nav stays clean.
- **Hero copy** opens with *"Founded in 1999, Kopman Build is…"* and the meta strip reads `Kopman Build / Est. 1999 / Vol. XXVI`.
- **By-the-Numbers strip** directly under the hero photo: Founded 1999 · 320+ projects · 9.4M sqft built · 98% on-time/budget — with a *"Illustrative figures · verifiable references furnished on request"* footnote built into the markup.
- **Trust strip** broadened to institutional clients: Private Owners · Family Offices · Institutional Developers · Sovereign & Diplomatic · Architects of Record · Hospitality Groups.
- **Recognition / press strip** inside About: example placements (Architectural Record, WSJ, Dezeen, FT *How To Spend It*, Wallpaper*, Robb Report) under an *"As referenced in"* label, with a *"swap for verified press"* disclaimer.
- **Global offices grid** in Contact: New York (HQ) · London · Dubai · Singapore.
- **Footer hero block**: large K mark + italic tagline *"Building deliberately, since 1999."* + Est. **MCMXCIX** mono eyebrow. Copyright now reads `© 1999 — ⟨current year⟩`.
- **SEO**: title tag, meta description, and JSON-LD updated with `foundingDate: 1999` and a 4-city `address` array (`AddressLocality` for NYC, London, Dubai, Singapore).

**Important — the numbers, press names, and office addresses are illustrative example content.** The Kopman team should swap in audited figures, cleared press logos, and real street addresses before launch. Disclaimers are present in the markup so nothing reads as a verified claim.

---

## About the design files

`site/index.html` is a **complete, production-ready static HTML page**. Unlike a typical handoff where the HTML is a rough reference to be re-implemented, this file is intentionally:

- A single self-contained `.html` (one network request after fonts)
- Zero build step, zero dependencies, zero JS frameworks
- Semantic HTML5, accessible, SEO-complete (OG + Twitter + JSON-LD)
- ~1300 lines incl. CSS + a tiny vanilla JS block

You can ship `site/index.html` **as-is** to any static host (recommended path — see `DEPLOY.md`), **or** recreate the design in a framework codebase (Next.js, Astro, etc.) using this README as the spec.

## Fidelity

**High-fidelity** — final colors, typography, spacing, copy, and interactions are all production-grade. Re-implementations should be pixel-faithful.

---

## Pages / Sections

Single-page site with anchor navigation:

| Anchor      | Section            | Purpose |
|-------------|--------------------|---------|
| `#home`     | Hero               | Headline, value prop, two CTAs, hero image, trust strip |
| `#about`    | About              | Statement, 4 values, founder card |
| `#services` | Services           | 6-cell grid: Custom Homes · Renovations · Commercial Builds · Project Management · Development Consulting · Design-Build |
| `#projects` | Projects portfolio | 6 cards with category filters + "coming soon" states |
| `#process`  | Process            | 7 stages on dark background |
| `#contact`  | Contact            | Info + 7-field form |
| —           | Footer             | Nav, contact, large wordmark |

---

## Design Tokens

### Color
| Token           | Value                          | Use |
|-----------------|--------------------------------|-----|
| `--bg`          | `#f3efe8`                      | Linen background (light sections) |
| `--bg-2`        | `#ebe6dc`                      | Concrete background (services strip) |
| `--bg-3`        | `#1a1a18`                      | Warm near-black (process, footer) |
| `--ink`         | `#1a1a18`                      | Primary text |
| `--ink-2`       | `#3a3a36`                      | Secondary text |
| `--ink-3`       | `#6b675f`                      | Tertiary / mono meta text |
| `--line`        | `#d8d3c8`                      | Hairline dividers |
| `--line-2`      | `#c4bfb3`                      | Button borders, form underlines |
| `--inv`         | `#f3efe8`                      | Inverse text on dark surfaces |
| `--accent`      | `oklch(58% 0.09 45)`           | Muted terracotta — used sparingly |
| `--accent-ink`  | `oklch(40% 0.08 45)`           | Hover state for primary button |

### Typography
- **Display**: `Instrument Serif` (Google Fonts) — italics carry editorial emphasis
- **UI / body**: `Geist` 300/400/500/600 (Google Fonts)
- **Meta / labels**: `Geist Mono` 400/500

| Element          | Size                                | Weight | Letter-spacing |
|------------------|-------------------------------------|--------|----------------|
| Hero H1          | `clamp(56px, 11vw, 168px)`          | 400    | -0.02em        |
| Section H2       | `clamp(40px, 5.6vw, 84px)`          | 400    | -0.02em        |
| Section sub p    | `clamp(16px, 1.3vw, 18px)`          | 400    | normal         |
| Service title    | `clamp(28px, 2.4vw, 36px)`          | 400    | -0.01em        |
| Body text        | `16px / 1.55`                       | 400    | normal         |
| Eyebrow / meta   | `11px`, uppercase                    | 400    | 0.14em         |

### Spacing
- Page gutter: `clamp(20px, 4vw, 56px)`
- Max content width: `1320px`
- Section vertical padding: `clamp(72px, 11vw, 140px)`
- Border radius: `2px` (small), `4px` (cards/images), `999px` (buttons/pills)

### Breakpoints
- `≤1100px` — hide nav "EST. —" sub badge
- `≤980px` — services grid 3→2 col, projects grid 6→4 col
- `≤880px` — hide desktop nav, show mobile drawer; about + contact grids collapse to 1 col; team card stacks
- `≤620px` — services grid 2→1 col
- `≤600px` — projects grid → 1 col
- `≤520px` — footer top row → 1 col

---

## Component Specs

### Nav (sticky, blurred)
- Sticky, `backdrop-filter: blur(14px)`, semi-transparent background
- 72px tall; brand left, links centre-right, primary CTA right
- "EST. —" mono badge next to brand (hidden ≤1100px)
- Mobile: hamburger → full-screen drawer with large serif links

### Buttons
- **Primary**: solid `--ink` on `--bg`, hovers to `--accent-ink`; arrow icon translates ↗ on hover
- **Ghost**: transparent + `--line-2` border, inverts to ink-on-bg on hover
- Pill shape (`border-radius: 999px`), `16px 22px` padding

### Hero
- Editorial meta line (mono) at top
- Massive serif headline with italic emphasis on "Delivering" and italic terracotta `integrity`
- 2-column sub: paragraph + CTA pair
- Wide hero image placeholder (16:7) with "Fig. 01" corner tag and mono caption pill

### Trust strip
- Horizontal between hero & about
- Mono label · 5 client-type names in serif (no fake logos) · mono note

### Services grid
- 3×2 grid with shared hairline borders (no gaps)
- Each cell: mono meta row · big serif title · `—`-bulleted feature list · "Inquire →" arrow at bottom
- **Hover**: cell inverts to dark (`--ink` bg + `--inv` text), arrow becomes terracotta accent

### Projects grid
- 6-column masonry-ish layout: one `size-lg` (span 4), two `size-md` (span 3 each), three `size-sm` (span 2 each)
- Filter chips above grid (All / Residential / Commercial / Renovation / Development); non-matching cards fade to 25% opacity, not removed
- Card: image w/ category badge OR "Case study coming soon" centred text · mono meta row · serif title · description

### Process (dark section)
- `--bg-3` background, white text
- 7 rows, each: mono number (col 1) · serif title (col 2) · description (col 3) · duration tag (col 4)
- Hover slightly inset (12px padding shift) — subtle, not gimmicky

### Contact form
- 2-col layout on desktop, stacks on mobile
- Fields (`*` = required): Name*, Email*, Phone, Project Type*, Budget Range*, Timeline*, Message*
- Underline-only inputs (no rounded boxes), mono uppercase labels
- Required asterisks rendered in terracotta accent
- Per-field error state (border + small mono error line)
- Live aria status region below submit
- Submit is wired to a **safe placeholder** (700ms simulated network) — see `DEPLOY.md` to connect a real backend

### Footer
- Dark wordmark section with 4-col link grid → huge "Kopman *Build*." wordmark → bottom bar (copyright · tagline · domain)

---

## Interactions / JS

The only JS in `index.html`:

1. **Year** — auto-updates copyright year
2. **Mobile drawer** — open/close, traps body scroll, syncs `aria-expanded`
3. **Project filters** — click chip → dim non-matching cards
4. **Form validation** — client-side (email regex, phone regex, required, min length); per-field error class; placeholder submit
5. **Reveal on scroll** — `IntersectionObserver` adds `.in` class to fade/translate elements in once

No frameworks. No bundler. No dependencies beyond two Google Fonts URLs.

---

## SEO

Already in `<head>`:
- `<title>`, meta description, meta keywords, canonical, theme-color, author
- Full Open Graph (`og:type`, `og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`)
- Twitter card (`twitter:card`, `twitter:title`, `twitter:description`)
- JSON-LD `GeneralContractor` structured data

**Before launch you must replace:**
- `og:image` URL with a real 1200×630 social card (`og.jpg`)
- Phone / email / service area in JSON-LD with real values
- Canonical URL if domain differs

---

## Placeholders to fill before going live

| Placeholder                                            | Where                                       |
|--------------------------------------------------------|---------------------------------------------|
| Real hero photograph                                   | `.hero-image`                               |
| Audited "by the numbers" figures                       | `.numbers` block in hero                    |
| Real press / award logos                               | `.recognition` strip in About               |
| Founder name + bio + headshot                          | About → `.team-card`                        |
| Real project imagery + case studies                    | All 6 project cards                         |
| Office street addresses + phone numbers                | Contact → `.offices` grid (4 cities)        |
| `hello@` / `press@` / `careers@` email routing         | Contact + Footer                            |
| `og:image` social card (1200×630)                      | `<head>`                                    |
| Favicon                                                | `<head>` (not yet present)                  |
| Form backend endpoint                                  | `<script>` at bottom — see `DEPLOY.md`      |
| Client logos for trust strip                           | Currently shows client *types* only — fine to keep as-is, or swap for cleared partner logos |

**Do not fabricate** awards, certifications, client names, or photography. The current copy and figures are written to be plausible illustrative content with disclaimers, not unverifiable claims.

---

## Deployment

See **`DEPLOY.md`** in this folder for step-by-step instructions to push this live (Cloudflare Pages, Netlify, Vercel, or GitHub Pages).

## Files

- `site/index.html` — the entire site (v2)

---

## If recreating in a framework codebase

If the target codebase is React/Next/Astro/etc., a sensible structure:

```
app/
├── layout.tsx              ← <head>, JSON-LD, Google Fonts
├── page.tsx                ← orchestrates sections
└── components/
    ├── Nav.tsx
    ├── Hero.tsx
    ├── TrustStrip.tsx
    ├── About.tsx
    ├── Services.tsx
    ├── Projects.tsx        ← filters live here
    ├── Process.tsx
    ├── Contact.tsx         ← form + validation + server action
    └── Footer.tsx
styles/
└── tokens.css              ← copy `:root { --bg, --ink, --accent... }` block verbatim
```

Re-use the design tokens table above; the visual system is intentionally token-driven so a port is mechanical.

---

## Where the application lives

This repository is the **marketing site only**. `vercel.json` deploys `site/`,
a set of static location pages, and nothing else here is built or served.

Build OS — the multi-tenant operations platform for the engagement — used to sit
in a `buildos/` directory here as well. It was an exact, byte-for-byte copy of
the standalone Build OS repository: not deployed by this project, not built by
it, and with nothing to notice if the two ever disagreed. On 2026-08-30 they
did disagree, within an hour of somebody fixing dead imports in one of them.

It is removed. The application is one repository now, and this one is the site.

`buildos/apps/web/.env.vercel` went with it. That file carried a live
`AUTH_SECRET` and six other credentials, and it was untracked before this
change — but **removal is not rotation**. Those values are in the history of
two repositories, they stay there, and they are still to be rotated.
