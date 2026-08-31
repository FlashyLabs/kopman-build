#!/usr/bin/env node
// The minimum truthful directory fragment, derived from what a repository
// already stamps into its own records.
//
//   node vendor-directory.mjs [--out directory.fragment.json] [--asserted YYYY-MM-DD]
//
// -- Why this exists ---------------------------------------------------------
//
// Sixteen repositories in this estate seal a `shipped/1` record and publish no
// directory fragment. Every entry they have ever sealed carries
// `assertedBy: agent/<slug>-ci`, and nothing anywhere defines that id — 2,478
// edges, at the first count, citing identities that formally do not exist. An
// `assertedBy` naming an id nothing declares reads as provenance and carries
// none, which is worse than leaving the field out.
//
// The repositories with a fragment each hand-wrote a `scripts/directory.mjs`
// around their AAO charter. That works and does not travel: the sixteen have no
// charter, two of the estate's repositories have no `package.json` at all, and
// an outside adopter of `shipped/1` hits the same wall on their first push.
//
// -- What it deliberately does not emit --------------------------------------
//
// **No organisation.** `.shiplog/config.json` carries an `org` field, and in
// this estate it was filled in on adoption with the repository's own slug —
// `org/aao`, `org/flashy-sdk`, `org/flashy-infra`. None of those companies
// exist. AAO is a specification, `flashy-sdk` is a library, and the register in
// gord.holdings names neither. Defining them here to make a provenance number
// go up would put sixteen fictional organisations into the published graph, and
// a graph is worth exactly what its worst assertion is worth.
//
// A repository is not the authority for which organisation answers for it. That
// is the register's job. So this emits what the repository genuinely is the
// authority for — the machines it runs and the human they act for — and leaves
// the organisation to be asserted by whoever actually knows.
//
// **No `operates`.** That edge is org → agent, and there is no org here.
// `delegatedTo` (person → agent) is the one that carries the meaning anyway:
// `operates` says the organisation runs the machine, `delegatedTo` says whose
// authority it acts on, and an agent with no stated bound is one nobody can say
// has exceeded anything.
//
// **No definition of anything it borrows.** The accountable person is defined
// by the register and the standards are defined by flashyos. Both are written
// to `directory.externals.json` so the validator can tell a borrowed id from a
// dangling one.
//
// Dependency-free on purpose: the repositories that need this most are the ones
// with no toolchain. Vendored from @flashyos/directory — keep the copies
// identical and pass repository-specific values as flags, never by editing.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const fail = (message) => {
  process.stderr.write(`  ${message}\n`)
  process.exit(2)
}

const shiplog = readJson(join(ROOT, '.shiplog', 'config.json'))
const backlog = readJson(join(ROOT, '.backlog', 'config.json'))

if (!shiplog && !backlog)
  fail('no .shiplog/config.json and no .backlog/config.json — nothing here signs a record, so there is nothing to declare')

const SOURCE = shiplog?.source ?? backlog?.source
if (!SOURCE || !/^repo\/[a-z0-9][a-z0-9._-]*$/.test(SOURCE))
  fail(`source must be a repo/<slug> id, got "${SOURCE}" — it is the id every entry already carries`)
const SLUG = SOURCE.slice('repo/'.length)

// The accountable human, read rather than assumed.
//
// Refused when absent rather than defaulted. A `delegatedTo` edge is the whole
// point of this fragment — it is what turns a machine signature into somebody's
// signature — and inventing whose authority a machine acts on is the one
// mistake that would make the record worse than silence.
const BY = shiplog?.defaultAuthor ?? backlog?.defaultAuthor
if (!BY || !BY.startsWith('person/'))
  fail(
    `defaultAuthor must be a person/<slug> id, got "${BY}". It is the human whose ` +
      'authority this repository\'s machines act on, and an agent with no stated ' +
      'bound is one nobody can say has exceeded anything.',
  )

/**
 * Every machine identity this repository stamps into something it publishes.
 *
 * Read from the file that does the stamping, never derived from the slug.
 * Deriving `${slug}-ci` was wrong in two repositories out of ten — ClaimYour.Gold
 * signs `agent/claimyour.gold-ci` against a slug of `claimyour-gold` — and a
 * declaration matching no signature anywhere passes every structural check
 * there is while fixing nothing.
 *
 * Two of them, not one. `.shiplog/config.json` stamps the seal and
 * `.backlog/config.json` stamps the filing, and they are different identities
 * in published data: the tenses are shaped differently on purpose, so different
 * things write them at different times.
 */
const MACHINES = [
  shiplog?.assertedBy && {
    id: shiplog.assertedBy,
    name: 'Record emitter',
    scope: ['shipped/1'],
    what: 'derives and seals this repository\'s record',
    emits: 'shipped/1',
  },
  backlog?.agent && {
    id: backlog.agent,
    name: 'Backlog emitter',
    scope: ['backlog/1'],
    what: 'files and promotes this repository\'s intentions',
    emits: 'backlog/1',
  },
].filter(Boolean)

for (const m of MACHINES)
  if (!m.id.startsWith('agent/'))
    fail(`a machine id must be an agent/<slug> id, got "${m.id}"`)

if (!MACHINES.length)
  fail('neither config names a machine — no assertedBy and no agent, so nothing signs anything here')

const ASSERTED = flag('--asserted', new Date().toISOString().slice(0, 10))
if (!/^\d{4}-\d{2}-\d{2}$/.test(ASSERTED)) fail(`--asserted must be YYYY-MM-DD, got "${ASSERTED}"`)
// A year. Long enough that a live repository restates it by emitting again,
// short enough that an abandoned one stops claiming to be current — which is
// the difference between a directory and a pile of stale strings.
const EXPIRES = `${Number(ASSERTED.slice(0, 4)) + 1}${ASSERTED.slice(4)}`

const base = { asserted: ASSERTED, assertedBy: BY, expires: EXPIRES, visibility: 'public' }
const nodes = []
const edges = []
const externals = new Set([BY])

for (const m of MACHINES) {
  nodes.push({
    ...base,
    id: m.id,
    kind: 'Agent',
    name: m.name,
    description: `The tool that ${m.what}. It emits ${m.emits} and signs each one as ${m.id}.`,
  })
  // Person → agent, carrying the scope: the shape of a Flashy ID root grant,
  // whose issuer is the accountable human and whose scope a chain may only ever
  // narrow. The record states the delegation; the signed assertion that
  // enforces it lives in Flashy ID. Proof never moves into the record.
  edges.push({ ...base, type: 'delegatedTo', from: BY, to: m.id, scope: m.scope })
}

/**
 * The machine surfaces this repository actually serves.
 *
 * Detected from disk rather than listed. A hand-kept list claims a surface the
 * day somebody deletes the file, and a declared surface that cannot be fetched
 * is worse than an undeclared one: it is a promise in the record with nothing
 * behind it.
 *
 * `cites`, never `defines`. Serving a standard is not authoring it, and
 * asserting a definition of somebody else's standard is exactly what the
 * federation rules forbid — which is also what makes each of these a real join
 * rather than a manufactured one.
 */
const SURFACES = [
  ['backlog/1', 'backlog.json'],
  ['shipped/1', 'shiplog.json'],
  ['checkpoint/1', 'checkpoint.json'],
  ['flashyos/1', 'flashyos.json'],
  ['aao/0.1', 'flashyos-charter.json'],
]
const WELL_KNOWN = ['public/.well-known', 'well-known', 'src/app/.well-known', 'static/.well-known']
const HOST = flag('--host', null)

for (const [profile, served] of SURFACES) {
  if (!WELL_KNOWN.some((dir) => existsSync(join(ROOT, dir, served)))) continue
  const slug = profile.replace(/[^a-z0-9]+/g, '-')
  const id = `src/${SLUG}-${slug}`
  nodes.push({
    ...base,
    id,
    kind: 'Source',
    name: `${profile} — ${SLUG}`,
    description: `The ${profile} surface this repository serves.`,
    ...(HOST ? { url: `https://${HOST}/.well-known/${served}` } : {}),
  })
  edges.push({ ...base, type: 'cites', from: id, to: `std/${slug}` })
  externals.add(`std/${slug}`)
}

const out = flag('--out', 'directory.fragment.json')
const fragment = {
  directory: '0.1',
  source: SOURCE,
  // A date, not a timestamp. The fragment is committed, so a clock in it makes
  // every re-emit a diff and every diff indistinguishable from a change.
  generated: ASSERTED,
  // Sorted, for the same reason. An emitter whose output depends on the order
  // it happened to build things in is one whose diffs cannot be read, and the
  // validator refuses it.
  nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
  edges: edges.sort((a, b) =>
    `${a.type} ${a.from} ${a.to}`.localeCompare(`${b.type} ${b.from} ${b.to}`),
  ),
}
writeFileSync(join(ROOT, out), `${JSON.stringify(fragment, null, 1)}\n`)
writeFileSync(
  join(ROOT, 'directory.externals.json'),
  `${JSON.stringify(
    {
      _comment:
        'Ids this fragment references and another repository defines. Written by the ' +
        'emitter, not maintained by hand: the emitter knows what it borrowed.',
      ids: [...externals].sort(),
    },
    null,
    1,
  )}\n`,
)

process.stdout.write(`  ${SOURCE} — ${nodes.length} nodes · ${edges.length} edges → ${out}\n`)

// The organisation, and why it is not in the file above.
//
// Said once, on every run, rather than filed as a warning somebody silences.
// The gap is real and this tool is not the thing that can close it.
if (shiplog?.org || backlog?.org) {
  process.stdout.write(
    `  ${shiplog?.org ?? backlog?.org} is named by every record here and is not declared: a\n` +
      '  repository is not the authority for which organisation answers for it.\n',
  )
}
