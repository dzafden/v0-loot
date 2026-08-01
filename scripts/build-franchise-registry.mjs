import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql'
const OUTPUT_PATH = resolve('src/data/generated/franchise-registry.json')
const USER_AGENT = 'LootFranchiseRegistry/1.0 (https://github.com; contact: local-development)'

const membershipQuery = String.raw`
SELECT ?property ?group ?groupLabel ?work ?workLabel ?mediaType ?tmdbId ?releaseDate WHERE {
  VALUES ?property { wdt:P179 wdt:P8345 wdt:P1434 }
  {
    ?work wdt:P31 wd:Q202866;
          wdt:P4947 ?tmdbId.
    BIND("movie" AS ?mediaType)
  }
  UNION
  {
    VALUES ?tvType { wd:Q581714 wd:Q117467246 wd:Q63952888 }
    ?work wdt:P31 ?tvType;
          wdt:P4983 ?tmdbId.
    BIND("tv" AS ?mediaType)
  }
  ?work ?property ?group.
  OPTIONAL { ?work wdt:P577 ?releaseDate. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`

const relationshipQuery = String.raw`
SELECT ?property ?from ?fromLabel ?fromMediaType ?fromTmdbId ?to ?toLabel ?toMediaType ?toTmdbId WHERE {
  VALUES ?property { wdt:P156 wdt:P2512 }
  VALUES ?animatedType { wd:Q202866 wd:Q581714 wd:Q117467246 wd:Q63952888 }
  VALUES ?otherAnimatedType { wd:Q202866 wd:Q581714 wd:Q117467246 wd:Q63952888 }
  ?from wdt:P31 ?animatedType;
        ?property ?to.
  ?to wdt:P31 ?otherAnimatedType.
  {
    {
      ?from wdt:P4947 ?fromTmdbId.
      BIND("movie" AS ?fromMediaType)
    }
    UNION
    {
      ?from wdt:P4983 ?fromTmdbId.
      BIND("tv" AS ?fromMediaType)
    }
  }
  {
    {
      ?to wdt:P4947 ?toTmdbId.
      BIND("movie" AS ?toMediaType)
    }
    UNION
    {
      ?to wdt:P4983 ?toTmdbId.
      BIND("tv" AS ?toMediaType)
    }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`

function entityId(uri) {
  return uri.split('/').at(-1)
}

function propertyKind(uri) {
  if (uri.endsWith('/P1434')) return 'universe'
  return uri.endsWith('/P8345') ? 'franchise' : 'collection'
}

function relationshipKind(uri) {
  return uri.endsWith('/P2512') ? 'spin-off' : 'sequence'
}

function earliestDate(current, candidate) {
  if (!candidate) return current
  const normalized = candidate.slice(0, 10)
  if (!current || normalized < current) return normalized
  return current
}

function isCatalogueLabel(label) {
  return /^(list of|filmography\b)|\b(feature films|productions|film catalogue|film catalog)$/i.test(label.trim())
}

async function fetchRows(sparql) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const body = new URLSearchParams({ query: sparql, format: 'json' })
    const response = await fetch(WIKIDATA_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': USER_AGENT,
      },
      body,
    })
    if (response.ok) {
      const payload = await response.json()
      return payload.results.bindings
    }
    if (![429, 502, 503, 504].includes(response.status) || attempt === 4) {
      throw new Error(`Wikidata registry query failed: ${response.status}`)
    }
    const retryAfter = Number(response.headers.get('retry-after'))
    const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1_000 : attempt * 5_000
    await new Promise((resolve) => setTimeout(resolve, Math.max(2_000, delayMs)))
  }
  throw new Error('Wikidata registry query failed after retries')
}

function buildRegistry(rows) {
  const groups = new Map()
  for (const row of rows) {
    const groupId = entityId(row.group.value)
    const workId = entityId(row.work.value)
    const kind = propertyKind(row.property.value)
    const key = `wikidata:${kind}:${groupId}`
    const group = groups.get(key) ?? {
      id: key,
      wikidataId: groupId,
      name: row.groupLabel?.value ?? groupId,
      kind,
      source: 'wikidata',
      achievementEligible: false,
      members: new Map(),
    }
    const mediaType = row.mediaType.value
    const tmdbId = Number(row.tmdbId.value)
    const memberKey = `${mediaType}:${tmdbId}`
    const member = group.members.get(memberKey) ?? {
      key: memberKey,
      id: tmdbId,
      mediaType,
      name: row.workLabel?.value ?? workId,
      wikidataId: workId,
    }
    member.releaseDate = earliestDate(member.releaseDate, row.releaseDate?.value)
    group.members.set(memberKey, member)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group) => ({ ...group, members: [...group.members.values()] }))
    .filter((group) => group.members.length >= 2)
    .filter((group) => !isCatalogueLabel(group.name))
    .map((group) => ({
      ...group,
      members: group.members.sort((a, b) => (
        (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999')
        || a.name.localeCompare(b.name)
      )),
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
}

function buildRelationships(rows) {
  const relationships = new Map()
  for (const row of rows) {
    const kind = relationshipKind(row.property.value)
    const fromMediaType = row.fromMediaType.value
    const toMediaType = row.toMediaType.value
    const fromId = Number(row.fromTmdbId.value)
    const toId = Number(row.toTmdbId.value)
    const id = `wikidata:${kind}:${fromMediaType}:${fromId}:${toMediaType}:${toId}`
    relationships.set(id, {
      id,
      kind,
      source: 'wikidata',
      from: {
        key: `${fromMediaType}:${fromId}`,
        id: fromId,
        mediaType: fromMediaType,
        name: row.fromLabel?.value ?? entityId(row.from.value),
        wikidataId: entityId(row.from.value),
      },
      to: {
        key: `${toMediaType}:${toId}`,
        id: toId,
        mediaType: toMediaType,
        name: row.toLabel?.value ?? entityId(row.to.value),
        wikidataId: entityId(row.to.value),
      },
    })
  }
  return [...relationships.values()].sort((a, b) => a.id.localeCompare(b.id))
}

const membershipRows = await fetchRows(membershipQuery)
const relationshipRows = await fetchRows(relationshipQuery)
const groups = buildRegistry(membershipRows)
const relationships = buildRelationships(relationshipRows)
const registry = {
  version: 1,
  generatedAt: new Date().toISOString(),
  license: 'CC0-1.0',
  sourceUrl: 'https://www.wikidata.org/',
  groups,
  relationships,
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true })
await writeFile(OUTPUT_PATH, `${JSON.stringify(registry, null, 2)}\n`)
process.stdout.write(`Generated ${groups.length} franchise groups and ${relationships.length} direct relationships from Wikidata.\n`)
