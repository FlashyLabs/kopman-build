# Kopman Group & Kopman Properties — production sites

Two independent, zero-build static sites, each with one serverless function for the
contact form. Both are deployed as **separate Vercel projects** from this one repository.

```
sites/
├── maccabi-partners/      → maccabi.partners
├── kopman-group/          → kopman.group
│   ├── index.html         single page, self-contained CSS + JS
│   ├── api/contact.js     serverless contact endpoint (Resend)
│   ├── og.png             1200×630, rendered in the brand faces
│   ├── favicon.svg  robots.txt  sitemap.xml  vercel.json
└── kopman-properties/     → kopman.properties
    └── (same structure)
```

## Design system

Both sites use the **kopmanbuild.com frame**, unchanged: 72px sticky blurred nav, the
architectural K monogram, the `Est. —` mono badge, the full-screen mobile drawer, the
pill buttons with the diagonal arrow, and the footer with the oversized serif wordmark.
Typography is the group's: Instrument Serif / Geist / Geist Mono.

The three sites differ only in **ground temperature and accent**:

| Site | Ground | Ink | Accent |
|---|---|---|---|
| kopmanbuild.com | `#f3efe8` linen | `#1a1a18` | terracotta |
| **kopman.group** | `#f3efe8` linen — inherits Build's ground | `#1a1a18` | **none of its own** |
| **kopman.properties** | `#DFDCD5` concrete-2 | `#17181A` | `#A96C14` dock amber |

Two notes on that table:

- **kopman.group deliberately has no accent colour.** The parent's colour is its
  children's — terracotta, amber and steel appear only as the dots beside each company
  in the Companies section. It is the quietest of the three sites by design.
- **kopman.properties bands lift to concrete-1** (`#E9E7E2`) rather than darkening,
  since the ground is already the darker of the two concretes.

Every text colour was contrast-checked against its own ground; the lowest ratio in body
copy is 4.8:1. Dock amber at `#A96C14` is used for fills, rules and markers; text set in
amber uses `#7E4F0C` (5.1:1). The chart palette (`#2F6FA0` / `#B27414`) passes
colourblind-separation, lightness-band, chroma and contrast checks.

## Deploying to Vercel

Two projects, one repo. For each:

1. **New Project** → import this repository.
2. **Root Directory**: `sites/kopman-group` (or `sites/kopman-properties`).
3. **Framework Preset**: Other. Leave build command and output directory empty —
   these are static sites, there is nothing to build.
4. **Environment Variables** (all three required for the contact form):

   | Variable | Value |
   |---|---|
   | `RESEND_API_KEY` | API key from resend.com |
   | `CONTACT_TO` | destination inbox, comma-separated for several |
   | `CONTACT_FROM` | a **verified sender on the domain**, e.g. `Kopman Group <site@kopman.group>` |

5. **Domains**: add `kopman.group` (and `www`), or `kopman.properties`.

### The contact form fails honestly

If those variables are missing the endpoint returns `503` and the page tells the visitor
to email directly. **It never shows a success message it cannot back up.** This is
deliberate: the audit of kopmanbuild.com found a form that simulated a 700 ms network
call, printed "your inquiry has been received", and posted nowhere — every lead since
launch was discarded. Neither of these sites can do that.

The endpoint also carries a honeypot field, per-field length caps, HTML escaping on every
value, and `reply_to` set to the sender so replies go straight back.

**Verify after deploying**: submit the form once on the live domain and confirm the email
arrives. Do not treat the form as working until you have seen that email.

## Before launch — items only Kopman can supply

The audit found placeholder identity data live on kopmanbuild.com (a
`+1-000-000-0000` telephone in the structured data, and offices in New York, London,
Dubai and Singapore with "address forthcoming"). Nothing of that kind is on these two
sites — but the following are genuinely absent and should be added rather than invented:

- [ ] **A real telephone number** on both sites, and in the `Organization` schema.
- [ ] **A street address**, if the group wants a Google Business Profile. Two profiles
      are appropriate — one for Build, one for Properties — but **not** a third for the
      holding company.
- [ ] **Leadership page** on kopman.group with named people and real biographies. This is
      the highest-value page a corporate site of this kind has, and it is not yet built.
- [ ] **Project and building photography.** Both sites are currently type-and-data only.
      Properties in particular needs acquired-condition photographs shot from a fixed
      position; renderings must be labelled as renderings inside the image.
- [ ] **`sameAs` targets** — LinkedIn, Wikidata, any registry or association profile.
      The arrays are present and empty; an array of dead URLs is worse than an empty one.
- [ ] **Confirm the Properties entity type with counsel.** The schema marks Kopman
      Properties as a plain `Organization`, deliberately **not** `RealEstateAgent`, which
      implies brokerage. If the business is a principal and not a licensed brokerage, that
      is correct — and the same answer governs how public copy describes it under RECO.
- [ ] **Analytics.** Neither site ships a tag. Add GA4 or Plausible on day one, plus a
      channel group matching `chatgpt|perplexity|claude|gemini|copilot` so AI referrals
      do not misattribute to direct.
- [ ] **Register both domains in Bing Webmaster Tools** — it feeds ChatGPT's retrieval and
      takes an afternoon.

## Figures on kopman.properties

Market and cost figures are labelled on the page as indicative, with a visible provenance
note in each section that carries numbers. They come from published industrial research
and our own estimating, and **none has been confirmed at source or with a listing broker.**
Before any of it is used in a transaction document it should be re-pulled from the primary
report. The property names shown in the chart and table illustrate market shape — they are
not represented as available.

## Accessibility

Skip link, visible focus rings, `aria-expanded` and `aria-hidden` on the drawer with
Escape-to-close and focus return, `prefers-reduced-motion` honoured on the reveal
animation and on smooth scrolling, real `<th scope>` on every table, wide tables scrolling
inside their own containers so the page body never scrolls sideways, and
`scroll-margin-top` on sections so anchor links clear the sticky nav.
