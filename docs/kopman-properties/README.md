# Kopman Properties — Board Pack, 23 Aug 2026

Four deliverables plus the technical audit that preceded them.

| # | Document | Covers |
|---|---|---|
| 00 | `00-site-audit.md` | Technical audit of kopmanbuild.com and the BuildOS monorepo |
| 01 | `01-group-positioning.html` | Kopman Group positioning, group architecture, expansion sequence |
| 02 | `02-business-plan.html` | Business plan, GTM, three underwritten warehouse case studies |
| 03 | `03-design-brief.html` | UI/UX brief for kopman.group and kopman.properties |
| 04 | `04-search-strategy.html` | Keyword cluster architecture, SEO and LLM strategy |

`retrofit-model.py` and `underwriting-model.py` reproduce every figure in document 02.

## Provenance

The network policy in the authoring environment blocked direct access to every primary
source — brokerage market reports, listing sites, municipal by-law PDFs, cost guides.
Research was assembled from search-engine synthesis. Every figure in these documents is
marked either **Source** (attributed to a named publisher, not read at source) or
**Derived** (our own arithmetic or estimating judgement). There is no "verified" tier.

Nothing here should enter an investment committee memo before it is re-pulled from the
primary document. Property listings in particular need broker re-confirmation — several
show signs of being stale.

## Three findings that changed the brief

1. **Docks are a leasability story, not a rent story.** Dock scope costs ~$68.80/sf of GFA
   and would need a $4.47/sf rent lift to break even, against a plausible $1.50–$3.50/sf
   premium. The value comes from converting an unleasable box into leasable bays.
2. **The exit is a sale to owner-occupiers, not a hold.** Held for income, all three
   candidates fail by $178–$320/sf. Subdivided and sold at $600/sf, two of the three clear.
3. **Buy large and subdivide.** Small buildings already carry the small-bay premium in the
   ask ($463–$876/sf). Buy 30,000–60,000 sf at $350–$400/sf; sell 3,000–8,000 sf bays.

## The one item to action today

`site/index.html:2096` — the contact form validates input, waits 700ms, and tells the
visitor their enquiry was received. It posts nowhere. Every web lead the construction arm
has ever received has been discarded. Roughly an hour to fix.
