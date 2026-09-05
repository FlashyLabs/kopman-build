#!/usr/bin/env node
/**
 * The share card, drawn from the brand rather than uploaded.
 *
 *   node scripts/og-card.mjs            write src/assets/og-card.png
 *   node scripts/og-card.mjs --check    fail if the committed card is stale
 *
 * A link to this site shared anywhere — a message, a post, a search result —
 * renders as whatever `og:image` names. With none, it renders as a grey box
 * with a domain under it, which is the shape a reader has learned to read as
 * "nothing here". This site emitted no `og:image` at all, and no image asset
 * existed to point one at.
 *
 * It is GENERATED, and that is the whole reason it is worth writing rather
 * than exporting one from a design tool. A card somebody exported drifts from
 * the brand the moment a colour changes, and nothing says so; this one reads
 * the same tokens the stylesheet does, so `--check` fails when they diverge.
 * The estate has paid for the other arrangement repeatedly — a vendored
 * snapshot with nothing to notice when the source moves.
 *
 * Dependency-free, like everything else here: PNG is a container around a
 * zlib stream, `node:zlib` is a builtin, and the type is a bitmap font
 * embedded below. That is the constraint this repository chose, and a card
 * generator that needed a headless browser would be a check nobody can run
 * before an install.
 */
import { deflateSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CARD = join(ROOT, 'site', 'og-card.png')

/**
 * The brand, as the pages already declare it. Never re-chosen here.
 *
 * `--accent` is `oklch(58% 0.09 45)` in the stylesheet; the hex below is that
 * colour converted, not a warm brown somebody picked to look similar. A card
 * whose accent is approximately the brand's is a card that reads as almost
 * right beside the site it links to.
 */
export const INK = {
  ground: '#F3EFE8', // the site's paper, and the card's ground: this is a light brand
  panel: '#EBE6DC',
  ink: '#1A1A18',
  accent: '#A7694C', // --accent, oklch(58% 0.09 45)
  deep: '#6A3820', // --accent-ink
  rule: '#D8D3C8',
  quiet: '#6B675F',
}

export const W = 1200
export const H = 630

// ── PNG, by hand ────────────────────────────────────────────────────────────
//
// Truecolour, 8-bit, no interlacing, filter 0 on every row. That is the
// simplest encoding a decoder must accept, and simplicity is the point: a
// clever filter choice would save bytes nobody is counting and add a failure
// mode this file cannot test.

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

export function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  // One filter byte per scanline, then the row. Filter 0 is "none".
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    const at = y * (1 + width * 3)
    raw[at] = 0
    rgb.copy(raw, at + 1, y * width * 3, (y + 1) * width * 3)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── a canvas ────────────────────────────────────────────────────────────────

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]

export function canvas(width, height, bg) {
  const buf = Buffer.alloc(width * height * 3)
  const [r, g, b] = hex(bg)
  for (let i = 0; i < buf.length; i += 3) {
    buf[i] = r
    buf[i + 1] = g
    buf[i + 2] = b
  }
  const px = (x, y, colour, alpha = 1) => {
    // Rounded, because `buf[i]` with a fractional `i` writes nothing and
    // reports nothing. Centring text produced a half-pixel x, every write was
    // discarded, and the card rendered with three labels simply absent — a
    // whole element missing with no error anywhere.
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = (y * width + x) * 3
    const [cr, cg, cb] = colour
    // Straight alpha over the existing pixel. Only used for the mark's edges;
    // the type is drawn opaque, because a bitmap font blended at the edges
    // reads as blur rather than as antialiasing at this glyph size.
    buf[i] = Math.round(buf[i] * (1 - alpha) + cr * alpha)
    buf[i + 1] = Math.round(buf[i + 1] * (1 - alpha) + cg * alpha)
    buf[i + 2] = Math.round(buf[i + 2] * (1 - alpha) + cb * alpha)
  }
  return {
    buf,
    px,
    rect(x, y, w, h, colour, alpha = 1) {
      const c = hex(colour)
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, c, alpha)
    },
    disc(cx, cy, radius, colour) {
      const c = hex(colour)
      for (let yy = cy - radius; yy <= cy + radius; yy++) {
        for (let xx = cx - radius; xx <= cx + radius; xx++) {
          const d = Math.hypot(xx - cx, yy - cy)
          // One pixel of coverage falloff at the rim, so a disc on a dark
          // ground does not read as a staircase.
          if (d <= radius - 0.5) px(xx, yy, c)
          else if (d < radius + 0.5) px(xx, yy, c, radius + 0.5 - d)
        }
      }
    },
    ring(cx, cy, radius, thickness, colour) {
      const c = hex(colour)
      for (let yy = cy - radius - 1; yy <= cy + radius + 1; yy++) {
        for (let xx = cx - radius - 1; xx <= cx + radius + 1; xx++) {
          const d = Math.hypot(xx - cx, yy - cy)
          const inner = radius - thickness
          if (d <= radius - 0.5 && d >= inner + 0.5) px(xx, yy, c)
          else if (d < radius + 0.5 && d > inner - 0.5) {
            const cover = Math.min(radius + 0.5 - d, d - (inner - 0.5), 1)
            if (cover > 0) px(xx, yy, c, cover)
          }
        }
      }
    },
  }
}

// ── type ────────────────────────────────────────────────────────────────────
//
// A 5x7 bitmap face, upscaled. Each glyph is seven rows; each row's low five
// bits are its pixels, most significant bit leftmost.
//
// Upscaling a bitmap rather than rasterising an outline is a deliberate limit,
// not a shortcut around one: an outline rasteriser is a dependency, and at the
// sizes a share card uses (48px and up) a clean 5x7 upscale reads as a
// deliberate pixel face rather than as a bad approximation of a good one.

const GLYPHS = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  3: [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  "'": [0x04, 0x04, 0, 0, 0, 0, 0],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
}

/** Width in pixels of a string at a given scale, including inter-letter gaps. */
export const textWidth = (s, scale, tracking = 1) =>
  s.length === 0 ? 0 : s.length * (5 + tracking) * scale - tracking * scale

/**
 * Refuses text that would run off the plate.
 *
 * `px` drops anything outside the canvas silently, so an over-long line does
 * not error — it is simply cut mid-word, and the card ships with a sentence
 * that stops. Loud is better: the whole point of generating the card is that
 * nobody looks at it again.
 */
export function fits(s, x, scale, width = W, margin = 150) {
  const end = x + textWidth(s, scale)
  if (end > width - margin + 1) {
    throw new Error(`"${s}" at ${scale}x runs to ${Math.round(end)}px, past the ${width - margin}px margin`)
  }
  return s
}

export function text(c, s, x, y, scale, colour, tracking = 1) {
  const rgb = hex(colour)
  let cx = x
  for (const raw of String(s)) {
    const ch = raw.toUpperCase()
    const g = GLYPHS[ch] ?? GLYPHS[' ']
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (!(g[row] & (1 << (4 - col)))) continue
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) c.px(cx + col * scale + dx, y + row * scale + dy, rgb)
      }
    }
    cx += (5 + tracking) * scale
  }
  return cx
}

// ── the card ────────────────────────────────────────────────────────────────

/**
 * Intent, published and then met.
 *
 * IntentMesh's argument is that an organisation states what it intends to do
 * and a stranger can check whether it did, so the card shows a stated intent
 * and a verified one — magenta for the claim, mint for the check, which is the
 * one place the stylesheet spends mint. A wordmark on a colour would say
 * nothing about this protocol that it does not say about every other.
 */
export function draw() {
  const c = canvas(W, H, INK.ground)

  // A panel inset, so the card reads as a plate rather than as a full bleed
  // when it lands on a white message ground.
  c.rect(0, 0, W, 10, INK.accent)
  c.rect(0, H - 10, W, 10, INK.deep, 0.45)

  // A rule and three marks would be somebody else's ladder. This is a builder
  // of twenty-six years: the mark is the span of that record, set as a measure.
  const cy = 210
  const rungs = [
    { x: 150, colour: INK.quiet, label: 'EST 1999' },
    { x: 430, colour: INK.accent, label: 'TORONTO' },
    { x: 710, colour: INK.deep, label: 'PERMITTED' },
  ]
  // The connecting rule sits behind the discs and stops at the last one: the
  // ladder ends at consecration rather than trailing off, because nothing in
  // the format comes after it.
  c.rect(rungs[0].x, cy - 2, rungs[2].x - rungs[0].x, 4, INK.rule)
  for (const r of rungs) {
    c.ring(r.x, cy, 44, 6, r.colour)
    c.disc(r.x, cy, 16, r.colour)
  }
  for (const r of rungs) {
    text(c, r.label, Math.round(r.x - textWidth(r.label, 3) / 2), cy + 76, 3, INK.quiet)
  }

  // Set on a grid rather than by eye: a 13x glyph is 91px tall, so the two
  // title lines and the footer are placed from their own heights. The first
  // draft overlapped the second line with the footer by nine pixels, which is
  // the kind of thing that looks like a font problem and is arithmetic.
  const TITLE = 13
  const line = 7 * TITLE
  const top = 336
  text(c, fits('KOPMAN', 150, TITLE), 150, top, TITLE, INK.ink)
  text(c, fits('BUILD', 150, TITLE), 150, top + line + 22, TITLE, INK.accent)

  // Kopman Holdings, never this estate's parent. kopmanbuild.com is a client's
  // site: the firm behind it is the client's own, and putting the estate's
  // holding company on a client's share card would be claiming a relationship
  // that is not ours to state.
  const foot = 'KOPMANBUILD.COM   KOPMAN HOLDINGS'
  text(c, fits(foot, 150, 4), 150, top + 2 * line + 66, 4, INK.quiet)

  return c
}

export const render = () => encodePng(W, H, draw().buf)

function main(argv) {
  const png = render()
  if (argv.includes('--check')) {
    let have
    try {
      have = readFileSync(CARD)
    } catch {
      console.error('og-card.png is missing — run `node scripts/og-card.mjs`')
      return 1
    }
    if (!have.equals(png)) {
      console.error('og-card.png is stale — the brand moved and the card did not.')
      console.error('Run `node scripts/og-card.mjs` and commit the result.')
      return 1
    }
    console.log(`og-card.png is current — ${W}x${H}, ${png.length} bytes`)
    return 0
  }
  mkdirSync(dirname(CARD), { recursive: true })
  writeFileSync(CARD, png)
  console.log(`wrote ${CARD} — ${W}x${H}, ${png.length} bytes`)
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)))
