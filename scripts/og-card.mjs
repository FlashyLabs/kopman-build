#!/usr/bin/env node
/**
 * The share card, rendered from this site's own logo and design system.
 *
 *   node scripts/og-card.mjs            write site/og-card.png
 *   node scripts/og-card.mjs --html     write the card's HTML and stop
 *   node scripts/og-card.mjs --check    fail if the committed card is absent
 *                                       or is not a 1200x630 PNG
 *
 * A link to this site shared anywhere — a message, a post, a search result —
 * renders as whatever `og:image` names. With none, it renders as a grey box
 * with a domain under it, which is the shape a reader has learned to read as
 * "nothing here". 690 of this site's 692 pages had no `og:image` at all.
 *
 * ── Why this replaced a dependency-free generator ────────────────────────────
 *
 * The first version of this file encoded a PNG by hand — zlib is a builtin,
 * so it needed nothing installed — and drew its type from a 5x7 bitmap font
 * embedded in the source. Its own comment argued that a card generator
 * needing a headless browser "would be a check nobody can run before an
 * install", and that argument is still true.
 *
 * It is overridden here on purpose, because the thing it was protecting was
 * not the thing that matters. This site's identity is Instrument Serif at a
 * display size, Geist Mono at 9-11px with 0.14-0.22em tracking, and a
 * geometric K. A bitmap font can honour none of that, so the card it produced
 * was recognisably NOT this brand while claiming to be drawn from it — a
 * generator whose output nobody would mistake for the site it links to.
 * Between a check that always runs over the wrong image and one that needs
 * Chromium over the right one, the image wins: the card is a picture of the
 * brand, and an approximation of a brand is a worse artefact than an
 * inconvenient build step.
 *
 * ── What makes it un-driftable ───────────────────────────────────────────────
 *
 * Nothing about the brand is re-typed here. The mark is READ out of
 * `index.html` — the same `<svg>` the nav renders — and the palette is read
 * from the `:root` custom properties that stylesheet declares, `oklch()` and
 * all, passed to Chromium unconverted. A colour somebody changes in the
 * stylesheet changes this card on its next run, and a mark somebody redraws
 * is redrawn here too, because there is no second copy to forget.
 *
 * That is the whole reason to generate rather than export: a card exported
 * from a design tool drifts from the brand the moment a token moves, and
 * nothing anywhere says so.
 *
 * The fonts are the site's own, fetched from the same Google Fonts families
 * its `<head>` names and inlined as data URIs, so the render does not depend
 * on the network at paint time — only at generation time.
 */
import { execFileSync } from 'node:child_process'
import { deflateSync, inflateSync } from 'node:zlib'
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SOURCE = join(ROOT, 'index.html')
export const CARD = join(ROOT, 'site', 'og-card.png')

export const W = 1200
export const H = 630

/** Chromium, wherever this machine keeps it. */
const CHROME = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean)

/**
 * The palette, read from the stylesheet rather than restated.
 *
 * `--accent` is `oklch(58% 0.09 45)` and stays in that notation: converting it
 * to a hex here would be a second opinion about a colour the site already
 * declares, and the two would disagree the first time somebody nudges it.
 */
export function tokens(html = readFileSync(SOURCE, 'utf8')) {
  const root = /:root\s*\{([\s\S]*?)\}/.exec(html)
  if (!root) throw new Error('index.html declares no :root block — the palette cannot be read')
  const out = {}
  for (const [, name, value] of root[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    out[name] = value.replace(/\/\*[\s\S]*?\*\//g, '').trim()
  }
  for (const need of ['bg', 'bg-2', 'ink', 'ink-2', 'ink-3', 'line', 'line-2', 'accent']) {
    if (!out[need]) throw new Error(`index.html declares no --${need}`)
  }
  return out
}

/**
 * The mark, lifted out of the nav.
 *
 * Anchored on the brand link so a decorative `<svg>` elsewhere in the page can
 * never be picked up instead — the card would still render, wearing somebody
 * else's icon, and nothing would say a word.
 */
export function mark(html = readFileSync(SOURCE, 'utf8')) {
  const brand = /<a[^>]*class="brand"[^>]*>[\s\S]*?<\/a>/.exec(html)
  if (!brand) throw new Error('index.html has no .brand link — the mark cannot be read')
  const svg = /<svg[\s\S]*?<\/svg>/.exec(brand[0])
  if (!svg) throw new Error('the .brand link carries no <svg> — the mark cannot be read')
  return svg[0]
}

/**
 * The share sentence, read from the page's own `og:description`.
 *
 * Every string on this card comes out of `index.html`. The alternative was
 * the hero's "by the numbers" strip, and it is deliberately not used: the
 * site labels those figures *"Illustrative figures — verifiable references
 * furnished on request"*, and a card is a crop with no room for the note. A
 * published number stripped of the sentence that qualifies it is a claim this
 * estate does not make.
 */
export function line(html = readFileSync(SOURCE, 'utf8')) {
  const m = /<meta property="og:description" content="([^"]+)"/.exec(html)
  if (!m) throw new Error('index.html declares no og:description — the card has nothing to say')
  return m[1].replace(/&amp;/g, '&').replace(/&mdash;/g, '\u2014')
}

/** The families this site's own `<head>` asks Google Fonts for. */
export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1' +
  '&family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap'

/**
 * Inline the webfonts.
 *
 * Chromium is given a `file://` page with no network, so a `@font-face` that
 * points at a URL renders in a fallback serif and reports nothing — the card
 * would come out looking almost right, which is the worst failure available
 * to a brand asset. Fetching here and embedding means a font that cannot be
 * had is an exception at generation time rather than a silent substitution.
 */
export async function fontCss(fetcher = fetch) {
  const res = await fetcher(FONTS_HREF, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Google Fonts answered ${res.status} — cannot render with the site's type`)
  let css = await res.text()
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))]
  if (urls.length === 0) throw new Error('the Google Fonts stylesheet named no font files')
  for (const url of urls) {
    const font = await fetcher(url)
    if (!font.ok) throw new Error(`${url} answered ${font.status}`)
    const bytes = Buffer.from(await font.arrayBuffer())
    const type = url.endsWith('.woff2') ? 'font/woff2' : 'font/ttf'
    css = css.split(url).join(`data:${type};base64,${bytes.toString('base64')}`)
  }
  return css
}

/**
 * The card, as a page.
 *
 * It is the hero of the site, cropped to 1.91:1: the mono meta rule across the
 * top, the lockup, the headline in Instrument Serif with the same italic and
 * the same accent on the last word, the striped-concrete band the hero uses
 * for its image placeholder, and a mono footer.
 *
 * KOPMAN HOLDINGS in that footer is this property's own parent and is not the
 * estate's — the card carries the name the client is known by.
 */
export function cardHtml({ t, svg, fonts, said }) {
  return `<!doctype html>
<meta charset="utf-8">
<style>
${fonts}
:root {
  --bg: ${t['bg']};
  --bg-2: ${t['bg-2']};
  --ink: ${t['ink']};
  --ink-2: ${t['ink-2']};
  --ink-3: ${t['ink-3']};
  --line: ${t['line']};
  --line-2: ${t['line-2']};
  --accent: ${t['accent']};
  --f-display: "Instrument Serif", Georgia, serif;
  --f-sans: "Geist", system-ui, sans-serif;
  --f-mono: "Geist Mono", ui-monospace, monospace;
}
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; }
body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--f-sans);
  -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column;
  padding: 56px 64px 48px;
}

/* the hero's meta rule */
.meta {
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--f-mono); font-size: 13px; color: var(--ink-3);
  letter-spacing: 0.14em; text-transform: uppercase;
  padding-bottom: 22px; border-bottom: 1px solid var(--line);
}

/* the nav lockup, at card scale */
.brand { display: flex; align-items: center; gap: 16px; padding: 30px 0 0; }
.brand .mark { width: 40px; height: 40px; color: var(--ink); display: block; }
.brand .mark svg { display: block; width: 100%; height: 100%; }
.brand .name { font-family: var(--f-display); font-size: 34px; letter-spacing: -0.01em; line-height: 1; }
.brand .sub {
  font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--ink-3);
  margin-left: 4px; padding-left: 14px; border-left: 1px solid var(--line-2);
  line-height: 1; display: flex; flex-direction: column; gap: 5px;
}
.brand .sub span:last-child { color: var(--ink-2); letter-spacing: 0.22em; }

h1 {
  font-family: var(--f-display); font-weight: 400;
  font-size: 84px; line-height: 0.92; letter-spacing: -0.01em;
  padding: 34px 0 0;
}
h1 em { font-style: italic; color: var(--ink-2); }
h1 .accent { font-style: italic; color: var(--accent); }

.said {
  font-family: var(--f-sans); font-weight: 300;
  font-size: 21px; line-height: 1.5; color: var(--ink-2);
  max-width: 60ch; padding: 30px 0 0;
}

.foot { margin-top: auto; }
/* the hero's striped concrete, as a rule with weight */
.band {
  height: 10px; border-radius: 4px; margin-bottom: 22px;
  background: repeating-linear-gradient(
    135deg,
    color-mix(in oklch, var(--bg-2) 86%, var(--ink) 14%) 0 2px,
    var(--bg-2) 2px 14px
  );
}
.foot-line {
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: var(--f-mono); font-size: 13px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-3);
}
.foot-line .lead { color: var(--ink); letter-spacing: 0.16em; }
</style>
<div class="meta">
  <span>Kopman Build / Est. 1999 / Vol. XXVI</span>
  <span>Premium Construction &amp; Development</span>
</div>
<div class="brand">
  <span class="mark">${svg}</span>
  <span class="name">Kopman Build</span>
  <span class="sub"><span>Est. 1999</span><span>Build &middot; No.&nbsp;001</span></span>
</div>
<h1>Building with precision.<br><em>Delivering</em> with <span class="accent">integrity</span>.</h1>
<p class="said">${said}</p>
<div class="foot">
  <div class="band"></div>
  <div class="foot-line">
    <span class="lead">kopmanbuild.com</span>
    <span>Kopman Holdings</span>
  </div>
</div>
`
}


// ── Cropping the window down to the card ────────────────────────────────────
//
// Chromium emits a screenshot at the WINDOW size and paints only the viewport
// rows; the rest is the page's background colour. So a card asked for at
// 1200x717 (630 plus the measured inset) is a correct 630-pixel card with 87
// rows of linen underneath it — indistinguishable from design in a light
// palette, and cropped off by every platform starting at the top.
//
// Truecolour 8-bit, which is what Chromium writes and the simplest thing a
// decoder must accept. Filters are undone on read and every row is written
// back as filter 0: a cleverer filter choice would save bytes nobody is
// counting and add a failure mode to a step whose only job is to be exact.

const crc32 = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return (buf) => {
    let c = -1
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
})()

const chunk = (type, data) => {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/** Keep the top `rows` scanlines of a truecolour PNG. */
export function cropTop(png, rows) {
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!magic.every((b, i) => png[i] === b)) throw new Error('not a PNG')
  let i = 8
  let w = 0
  let h = 0
  const idat = []
  while (i < png.length) {
    const len = png.readUInt32BE(i)
    const type = png.toString('ascii', i + 4, i + 8)
    if (type === 'IHDR') {
      w = png.readUInt32BE(i + 8)
      h = png.readUInt32BE(i + 12)
      if (png[i + 16] !== 8 || png[i + 17] !== 2) {
        throw new Error(`expected 8-bit truecolour, got depth ${png[i + 16]} colour type ${png[i + 17]}`)
      }
    }
    if (type === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len))
    i += 12 + len
  }
  if (rows > h) throw new Error(`cannot keep ${rows} rows of a ${h}-row image`)
  if (rows === h) return png

  const raw = inflateSync(Buffer.concat(idat))
  const bpp = 3
  const stride = w * bpp + 1
  const px = Buffer.alloc(w * h * bpp)
  for (let y = 0; y < h; y++) {
    const f = raw[y * stride]
    const line = raw.subarray(y * stride + 1, (y + 1) * stride)
    const row = y * w * bpp
    for (let x = 0; x < w * bpp; x++) {
      const a = x >= bpp ? px[row + x - bpp] : 0
      const b = y > 0 ? px[row - w * bpp + x] : 0
      const c = x >= bpp && y > 0 ? px[row - w * bpp + x - bpp] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (f !== 0) throw new Error(`unknown PNG filter ${f}`)
      px[row + x] = v & 255
    }
  }

  const out = Buffer.alloc(rows * (w * bpp + 1))
  for (let y = 0; y < rows; y++) {
    out[y * (w * bpp + 1)] = 0
    px.copy(out, y * (w * bpp + 1) + 1, y * w * bpp, (y + 1) * w * bpp)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(rows, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from(magic),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * How much shorter the viewport is than the window Chromium was asked for.
 *
 * `--window-size=1200,630` produces a 1200x543 viewport here — headless still
 * reserves room for decoration it does not draw — and the screenshot is
 * emitted at the full 630 with the missing rows filled in the page's
 * background colour. So a card asked for at exactly 630 loses its bottom 87
 * pixels to something that looks EXACTLY like empty space in a light design:
 * the footer simply was not there, the PNG was the right size, and nothing
 * anywhere errored.
 *
 * The inset is measured rather than added as a constant, because a constant
 * is right for one Chromium on one platform and silently wrong on the next.
 */
export function viewportInset(bin, want = H) {
  const dir = mkdtempSync(join(tmpdir(), 'kopman-vp-'))
  try {
    const probe = join(dir, 'vp.html')
    writeFileSync(
      probe,
      '<!doctype html><meta charset="utf-8"><body>' +
        "<script>document.body.setAttribute('data-vp', innerHeight)</script></body>",
    )
    const dom = execFileSync(
      bin,
      ['--headless', '--disable-gpu', '--no-sandbox', '--dump-dom', `--window-size=${W},${want}`, `file://${probe}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const m = /data-vp="(\d+)"/.exec(dom)
    if (!m) throw new Error('could not measure Chromium\u2019s viewport — refusing to guess an inset')
    return want - Number(m[1])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function chrome() {
  for (const path of CHROME) if (existsSync(path)) return path
  throw new Error(
    `no Chromium found. Tried:\n  ${CHROME.join('\n  ')}\nSet CHROME_PATH to one.`,
  )
}

export async function render() {
  const html = readFileSync(SOURCE, 'utf8')
  const page = cardHtml({ t: tokens(html), svg: mark(html), fonts: await fontCss(), said: line(html) })
  const bin = chrome()
  const inset = viewportInset(bin)
  const dir = mkdtempSync(join(tmpdir(), 'kopman-card-'))
  try {
    const src = join(dir, 'card.html')
    writeFileSync(src, page)
    execFileSync(
      bin,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',
        `--screenshot=${join(dir, 'card.png')}`,
        `--window-size=${W},${H + inset}`,
        `file://${src}`,
      ],
      { stdio: 'pipe' },
    )
    const png = cropTop(readFileSync(join(dir, 'card.png')), H)
    // Read the size out of the bytes rather than trusting the flag: a window
    // size Chromium declined to honour would ship a card every platform
    // letterboxes, and the crop takes the type off first.
    if (png.readUInt32BE(16) !== W || png.readUInt32BE(20) !== H) {
      throw new Error(`Chromium rendered ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, not ${W}x${H}`)
    }
    return { png, page }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * What `--check` can honestly ask.
 *
 * Not byte-identity with a fresh render: two Chromium versions rasterise the
 * same page to different bytes, so that check would fail for a reason nobody
 * can fix and would then be ignored — which is worse than not asking. It
 * asks the two things a stale or broken card actually looks like from
 * outside: absent, or not the shape a crawler crops to.
 */
export function inspect(file = CARD) {
  if (!existsSync(file)) return { ok: false, why: 'site/og-card.png does not exist' }
  const png = readFileSync(file)
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!magic.every((b, i) => png[i] === b)) return { ok: false, why: 'site/og-card.png is not a PNG' }
  const w = png.readUInt32BE(16)
  const h = png.readUInt32BE(20)
  if (w !== W || h !== H) return { ok: false, why: `site/og-card.png is ${w}x${h}, not ${W}x${H}` }
  return { ok: true, w, h, bytes: png.length }
}

async function main(argv) {
  if (argv.includes('--check')) {
    const v = inspect()
    if (!v.ok) {
      console.error(`${v.why} — run \`node scripts/og-card.mjs\``)
      return 1
    }
    console.log(`site/og-card.png — ${v.w}x${v.h}, ${(v.bytes / 1024).toFixed(1)}KB`)
    return 0
  }

  const html = readFileSync(SOURCE, 'utf8')
  if (argv.includes('--html')) {
    const page = cardHtml({
      t: tokens(html),
      svg: mark(html),
      fonts: '/* fonts fetched at render time */',
      said: line(html),
    })
    const out = join(ROOT, 'scripts', 'og-card.html')
    writeFileSync(out, page)
    console.log(`wrote ${out} (no fonts inlined — this is for reading, not rendering)`)
    return 0
  }

  const { png } = await render()
  writeFileSync(CARD, png)
  console.log(`site/og-card.png — ${W}x${H}, ${(png.length / 1024).toFixed(1)}KB`)
  console.log(`  accent  ${tokens(html)['accent']}   (read from index.html, not chosen here)`)
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)))
