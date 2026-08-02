/**
 * Anime franchise override pass.
 *
 * WHY THIS EXISTS
 * Wikidata models Western animation franchises well but anime badly — and not merely thinly:
 *   - "Naruto" resolves to 3 members and omits Naruto: Shippuuden entirely.
 *   - "Dragon Ball universe" includes Dr. Slump, a different Toriyama series.
 * AniList models anime as an explicit typed relation graph (SEQUEL / PREQUEL / SIDE_STORY /
 * PARENT), so one seed id reconstructs a whole franchise. Fribb's anime-lists then maps
 * AniList ids straight to TMDB ids, so no fuzzy title matching is needed.
 *
 * RUN ORDER — this reads and rewrites the registry produced by the Wikidata pass:
 *   node scripts/build-franchise-registry.mjs
 *   node scripts/build-anime-franchise-overrides.mjs
 *
 * Anime groups emitted here REPLACE any Wikidata group whose name reduces to the same stem.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const REGISTRY_PATH = resolve('src/data/generated/franchise-registry.json')
const FRIBB_URL = 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json'
const ANILIST_URL = 'https://graphql.anilist.co'
const TMDB_BASE = 'https://api.themoviedb.org/3'

const MIN_MEMBERS = 3
const MAX_MEMBERS = 30
/** Guards a runaway traversal (Gundam and Pokémon sprawl across dozens of entries). */
const MAX_NODES = 60
const ANILIST_DELAY_MS = 750
const TMDB_HYDRATION_CONCURRENCY = 6

/** Franchises where Wikidata is known to be thin or wrong. Resolved by search, never hardcoded. */
const SEEDS = [
  'Naruto', 'Dragon Ball', 'One Piece', 'Bleach',
  'Neon Genesis Evangelion', 'Bakemonogatari', 'Fate/stay night',
  'My Hero Academia', 'Jujutsu Kaisen', 'Sailor Moon',
  'Digimon Adventure', 'Cardcaptor Sakura',
  // Search resolves on Japanese titles far more reliably — 'Demon Slayer' matched an
  // unrelated show called Onigiri, and 'Code Geass' matched a DVD magazine.
  'Kimetsu no Yaiba', 'Code Geass: Hangyaku no Lelouch',
  'Mobile Suit Gundam', 'Pocket Monsters', 'Hunter x Hunter', 'Rurouni Kenshin',
]

/** Edges that mean "same franchise". ALTERNATIVE and CHARACTER are deliberately excluded —
 *  they pull in remakes and unrelated shows that merely share a cast. */
const FRANCHISE_EDGES = new Set(['SEQUEL', 'PREQUEL', 'PARENT', 'SIDE_STORY'])
/** Tighter set, used when the full traversal overflows MAX_MEMBERS. */
const CORE_EDGES = new Set(['SEQUEL', 'PREQUEL', 'PARENT'])

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

function readEnvKey() {
  return readFile(resolve('.env.local'), 'utf8')
    .then((raw) => raw.match(/^VITE_TMDB_API_KEY=(.+)$/m)?.[1]?.trim() ?? '')
    .catch(() => '')
}

async function anilist(query, variables) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (response.status === 429) {
      await sleep(Number(response.headers.get('retry-after') ?? 5) * 1000)
      continue
    }
    if (!response.ok) return null
    return response.json()
  }
  return null
}

const SEARCH_QUERY = `query ($search: String) {
  Media(search: $search, type: ANIME, sort: SEARCH_MATCH) { id title { romaji english } }
}`

const NODE_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id format title { romaji english }
    relations { edges { relationType node { id type format } } }
  }
}`

/** Breadth-first walk of the franchise graph from one seed. */
async function traverse(seedId, edges) {
  const seen = new Map()
  const queue = [seedId]
  while (queue.length && seen.size < MAX_NODES) {
    const id = queue.shift()
    if (seen.has(id)) continue
    const payload = await anilist(NODE_QUERY, { id })
    await sleep(ANILIST_DELAY_MS)
    const media = payload?.data?.Media
    if (!media) continue
    seen.set(id, media)
    for (const edge of media.relations?.edges ?? []) {
      const node = edge.node
      if (!edges.has(edge.relationType)) continue
      if (node.type !== 'ANIME') continue
      // Only whole works — OVAs, specials and music videos are not collection members.
      if (!['TV', 'TV_SHORT', 'MOVIE'].includes(node.format)) continue
      if (!seen.has(node.id)) queue.push(node.id)
    }
  }
  return [...seen.values()]
}

function normaliseName(name) {
  let value = String(name).toLowerCase()
  const suffix = /\s+(universe|franchise|collection|films?|film series|in film|movie series)$/
  while (suffix.test(value)) value = value.replace(suffix, '')
  return value.replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Fribb's mapping is NOT type-safe: when it lacks a real movie mapping it falls back to the
 * parent series. All three original Naruto films carry `themoviedb_id: { tv: 46260 }` — the
 * Naruto TV series. Trusting that collapses an entire franchise into one member.
 *
 * So the mapping is only accepted when the media type agrees with the AniList format;
 * everything else falls through to a TMDB title search.
 */
function tmdbRefFrom(entry, format) {
  const raw = entry?.themoviedb_id
  if (!raw) return null
  const first = (value) => Number(Array.isArray(value) ? value[0] : value)
  const wantsMovie = format === 'MOVIE'
  if (typeof raw === 'number') return wantsMovie ? { mediaType: 'movie', id: raw } : null
  if (typeof raw === 'object') {
    if (!wantsMovie && raw.tv) return { mediaType: 'tv', id: first(raw.tv) }
    if (wantsMovie && raw.movie) return { mediaType: 'movie', id: first(raw.movie) }
  }
  return null
}

/** Fallback when the id map is absent or type-mismatched. Measured ~7/8 on the Naruto set. */
async function tmdbSearch(media, key) {
  const kind = media.format === 'MOVIE' ? 'movie' : 'tv'
  for (const title of [media.title?.english, media.title?.romaji].filter(Boolean)) {
    const url = `${TMDB_BASE}/search/${kind}?api_key=${key}&query=${encodeURIComponent(title)}`
    const response = await fetch(url)
    if (!response.ok) continue
    const top = (await response.json())?.results?.[0]
    if (top?.id) return { mediaType: kind, id: top.id }
  }
  return null
}

async function tmdbDetail(ref, key) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${TMDB_BASE}/${ref.mediaType}/${ref.id}?api_key=${key}`)
    if (response.status === 429) {
      await sleep(Number(response.headers.get('retry-after') ?? 1) * 1000)
      continue
    }
    if (!response.ok) return null
    const data = await response.json()
    if (!data?.id) return null
    return {
      key: `${ref.mediaType}:${ref.id}`,
      id: ref.id,
      mediaType: ref.mediaType,
      name: data.name ?? data.title ?? String(ref.id),
      releaseDate: data.first_air_date || data.release_date || null,
      voteCount: data.vote_count ?? 0,
    }
  }
  return null
}

async function hydrateRegistryReleaseDates(registry, key) {
  const missingByKey = new Map()
  for (const group of registry.groups) {
    for (const member of group.members) {
      if (!member.releaseDate) missingByKey.set(member.key, member)
    }
  }
  const missing = [...missingByKey.values()]
  let cursor = 0
  let hydrated = 0
  const dates = new Map()
  const workers = Array.from({ length: TMDB_HYDRATION_CONCURRENCY }, async () => {
    while (cursor < missing.length) {
      const member = missing[cursor]
      cursor += 1
      const detail = await tmdbDetail({ mediaType: member.mediaType, id: member.id }, key)
      if (!detail?.releaseDate) continue
      dates.set(member.key, detail.releaseDate)
      hydrated += 1
    }
  })
  await Promise.all(workers)
  for (const group of registry.groups) {
    for (const member of group.members) {
      member.releaseDate ??= dates.get(member.key)
    }
    group.members.sort((a, b) =>
      (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999') || a.name.localeCompare(b.name))
  }
  process.stdout.write(`Hydrated ${hydrated}/${missing.length} missing registry release dates from TMDB.\n`)
}

async function main() {
  const tmdbKey = await readEnvKey()
  if (!tmdbKey) throw new Error('VITE_TMDB_API_KEY missing from .env.local')

  const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'))
  if (process.argv.includes('--hydrate-release-dates')) {
    await hydrateRegistryReleaseDates(registry, tmdbKey)
    registry.generatedAt = new Date().toISOString()
    await writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`)
    return
  }

  process.stdout.write('Fetching AniList → TMDB id map…\n')
  const fribb = await (await fetch(FRIBB_URL)).json()
  const byAnilistId = new Map()
  for (const entry of fribb) {
    if (entry.anilist_id) byAnilistId.set(entry.anilist_id, entry)
  }
  process.stdout.write(`  ${byAnilistId.size} AniList ids mapped\n\n`)

  const groups = []

  for (const seed of SEEDS) {
    const found = await anilist(SEARCH_QUERY, { search: seed })
    await sleep(ANILIST_DELAY_MS)
    const root = found?.data?.Media
    if (!root) {
      process.stdout.write(`  ${seed}: not found on AniList\n`)
      continue
    }

    let nodes = await traverse(root.id, FRANCHISE_EDGES)
    let edgeSet = 'full'
    if (nodes.length > MAX_MEMBERS) {
      nodes = await traverse(root.id, CORE_EDGES)
      edgeSet = 'core'
    }

    // Map to TMDB, drop anything unmapped or too obscure to belong in a collection.
    const members = []
    const seenKeys = new Set()
    for (const node of nodes) {
      const ref = tmdbRefFrom(byAnilistId.get(node.id), node.format)
        ?? await tmdbSearch(node, tmdbKey)
      if (!ref || !Number.isFinite(ref.id)) continue
      const detail = await tmdbDetail(ref, tmdbKey)
      if (!detail || detail.voteCount < 10) continue
      if (seenKeys.has(detail.key)) continue
      seenKeys.add(detail.key)
      members.push({ ...detail, anilistId: node.id })
    }

    const name = root.title.english || root.title.romaji
    if (members.length < MIN_MEMBERS || members.length > MAX_MEMBERS) {
      process.stdout.write(`  ${name}: ${members.length} members (${edgeSet}) — skipped, outside ${MIN_MEMBERS}-${MAX_MEMBERS}\n`)
      continue
    }

    members.sort((a, b) => (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999'))
    groups.push({
      id: `anilist:franchise:${root.id}`,
      anilistId: root.id,
      name,
      kind: 'franchise',
      source: 'anilist',
      achievementEligible: true,
      members: members.map(({ voteCount, ...member }) => member),
    })
    process.stdout.write(`  ${name}: ${members.length} members (${edgeSet} edges)\n`)
  }

  // AniList wins for anime: drop any Wikidata group reducing to the same stem.
  const claimed = new Set(groups.map((group) => normaliseName(group.name)))
  const kept = registry.groups.filter((group) => !claimed.has(normaliseName(group.name)))
  const replaced = registry.groups.length - kept.length

  registry.groups = [...kept, ...groups].sort((a, b) =>
    a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
  await hydrateRegistryReleaseDates(registry, tmdbKey)
  registry.generatedAt = new Date().toISOString()
  registry.sources = ['https://www.wikidata.org/', 'https://anilist.co/', FRIBB_URL]

  await writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`)
  const eligible = registry.groups.filter((group) => group.achievementEligible).length
  process.stdout.write(
    `\nAdded ${groups.length} AniList franchises, replaced ${replaced} Wikidata groups. ` +
    `Registry now holds ${registry.groups.length} groups, ${eligible} eligible.\n`,
  )
}

await main()
