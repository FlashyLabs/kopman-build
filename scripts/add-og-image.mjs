#!/usr/bin/env node
/**
 * Give every page a share card.
 *
 *   node scripts/add-og-image.mjs           insert the tags where they are missing
 *   node scripts/add-og-image.mjs --check   fail if any page is missing them
 *
 * These 692 pages already carried `og:title`, `og:description`, `og:url` and
 * `og:type`. They carried no `og:image` and no Twitter card, so every one of
 * them — the whole local-SEO surface this site is built on — rendered as a
 * grey box wherever it was shared or previewed. 690 of 692.
 *
 * There is no site generator in this repository: the pages ARE the source.
 * So this is the tool that maintains their heads, and it is written to be run
 * again rather than once — it inserts only what is absent, and `--check` is
 * what a new page has to pass.
 *
 * The insertion point is deliberate: immediately after `og:type`, so the
 * OpenGraph block stays contiguous and a person reading the head finds the
 * image beside the other three rather than somewhere further down.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const ORIGIN = 'https://kopmanbuild.com'
export const CARD_URL = `${ORIGIN}/og-card.png`
export const CARD_FILE = join(ROOT, 'site', 'og-card.png')

/** Every committed page. `site/` plus the root index, which is a page too. */
export function pages(root = ROOT) {
  const out = []
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === '.git') continue
      const full = join(dir, e)
      if (statSync(full).isDirectory()) walk(full)
      else if (e.endsWith('.html')) out.push(full)
    }
  }
  if (existsSync(join(root, 'site'))) walk(join(root, 'site'))
  const index = join(root, 'index.html')
  if (existsSync(index)) out.push(index)
  return out.sort()
}

/**
 * The tags a page needs, given the ones it already has.
 *
 * `og:title` and `og:description` are per-page and already correct on every
 * one of these pages, so the Twitter equivalents are derived from them rather
 * than restated — two hand-written copies of one sentence is how a head ends
 * up describing two different pages.
 */
export function missing(html) {
  const want = []
  if (!/property="og:image"/.test(html)) want.push('og:image')
  if (!/name="twitter:card"/.test(html)) want.push('twitter:card')
  return want
}

const attr = (html, re) => {
  const m = re.exec(html)
  return m ? m[1] : null
}

export function withCard(html) {
  if (missing(html).length === 0) return html

  const title = attr(html, /<meta property="og:title" content="([^"]*)"/)
  const desc = attr(html, /<meta property="og:description" content="([^"]*)"/)

  const block = [
    `<meta property="og:image" content="${CARD_URL}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Kopman Build" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...(title ? [`<meta name="twitter:title" content="${title}" />`] : []),
    ...(desc ? [`<meta name="twitter:description" content="${desc}" />`] : []),
    `<meta name="twitter:image" content="${CARD_URL}" />`,
  ].join('\n')

  // After og:type where there is one, so the block stays contiguous; after the
  // canonical link otherwise; before </head> as the last resort. A page whose
  // head has none of those is not one this script should be guessing about.
  for (const anchor of [
    /<meta property="og:type" content="[^"]*"\s*\/?>/,
    /<link rel="canonical"[^>]*>/,
  ]) {
    const m = anchor.exec(html)
    if (m) return html.slice(0, m.index + m[0].length) + '\n' + block + html.slice(m.index + m[0].length)
  }
  if (html.includes('</head>')) return html.replace('</head>', `${block}\n</head>`)
  return null
}

function main(argv) {
  const check = argv.includes('--check')
  const files = pages()
  if (files.length === 0) {
    console.error('no pages found — is this the right directory?')
    return 1
  }
  if (!existsSync(CARD_FILE)) {
    console.error('site/og-card.png is missing — run `node scripts/og-card.mjs`')
    return 1
  }

  const short = (f) => relative(ROOT, f)
  const bad = []
  let changed = 0
  for (const f of files) {
    const html = readFileSync(f, 'utf8')
    const want = missing(html)
    if (want.length === 0) continue
    if (check) {
      bad.push(`${short(f)} — no ${want.join(', ')}`)
      continue
    }
    const next = withCard(html)
    if (next === null) {
      bad.push(`${short(f)} — no anchor in its head to insert after`)
      continue
    }
    writeFileSync(f, next)
    changed += 1
  }

  if (check) {
    if (bad.length) {
      console.error(`${bad.length} of ${files.length} pages share as a grey box:`)
      for (const b of bad.slice(0, 10)) console.error(`  ${b}`)
      if (bad.length > 10) console.error(`  … and ${bad.length - 10} more`)
      return 1
    }
    console.log(`all ${files.length} pages carry a share card`)
    return 0
  }

  console.log(`${changed} page${changed === 1 ? '' : 's'} given a share card; ${files.length - changed} already had one`)
  for (const b of bad) console.error(`  refused: ${b}`)
  return bad.length ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)))
