import {
  getShowDetail,
  getShowKeywords,
  getShowRecommendations,
  type TmdbSearchResult,
} from './tmdb'
import {
  buildVibeCandidate,
  getSupportedVibes,
  scoreShowVibes,
  type VibeCandidate,
  type VibeCrate,
} from './vibe-engine'

const VIBE_SEEDS: Record<string, number[]> = {
  shounen_escalation: [37854, 46260, 65930],
  slice_of_life_cozy: [72517, 76121, 100049],
  isekai_power_fantasy: [65942, 64196, 90027],
  dark_fantasy_grim: [85937, 1429, 112160],
  adult_animation_cynical: [456, 60625, 61222],
  cartoon_nostalgia: [2190, 606, 246],
  stop_motion_craft: [8384, 10079, 33761],
  sports_underdog: [60863, 42705, 70881],
  mecha_scifi: [21720, 30983, 8863],
  magical_girl: [3570, 30984, 109820],
  psychological_mindbend: [112160, 101918, 82684],
  found_family: [246, 61175, 94605],
  comfort_rewatch_classics: [456, 2190, 40075],
  art_house_animation: [105248, 82684, 128306],
  superhero_animated: [2098, 95557, 135934],
  kids_all_ages: [40075, 61175, 33765],
  romance_yearning: [61663, 72517, 105009],
  horror_animated: [89893, 1095, 107261],
}

async function enrichOne(raw: TmdbSearchResult): Promise<VibeCandidate | null> {
  try {
    const [detail, keywords] = await Promise.all([getShowDetail(raw.id), getShowKeywords(raw.id)])
    return buildVibeCandidate(raw, detail, keywords.results ?? [])
  } catch {
    return null
  }
}

async function recommendationsForSeed(seedId: number): Promise<TmdbSearchResult[]> {
  try {
    const [page1, page2] = await Promise.all([
      getShowRecommendations(seedId, 1),
      getShowRecommendations(seedId, 2),
    ])
    return [...(page1.results ?? []), ...(page2.results ?? [])]
  } catch {
    return []
  }
}

function uniqById(shows: TmdbSearchResult[]) {
  const map = new Map<number, TmdbSearchResult>()
  for (const s of shows) {
    if (!map.has(s.id)) map.set(s.id, s)
  }
  return Array.from(map.values())
}

async function enrichBatch(shows: TmdbSearchResult[]): Promise<VibeCandidate[]> {
  const unique = uniqById(shows)
  const out: VibeCandidate[] = []
  const chunkSize = 6

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const enriched = await Promise.all(chunk.map(enrichOne))
    out.push(...enriched.filter((x): x is VibeCandidate => !!x))
  }

  return out.filter((c) => (c.popularity ?? 0) >= 8)
}

export async function buildVibeCratesFromTmdb(opts: {
  minScore?: number
  maxPerCrate?: number
  page?: number
  pageSize?: number
  expansionSeedsPerCrate?: number
} = {}): Promise<{ candidates: VibeCandidate[]; crates: VibeCrate[] }> {
  const minScore = opts.minScore ?? 0.58
  const maxPerCrate = opts.maxPerCrate ?? 8
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.max(1, opts.pageSize ?? maxPerCrate)
  const expansionSeedsPerCrate = Math.max(0, opts.expansionSeedsPerCrate ?? 6)

  const allCandidates: VibeCandidate[] = []
  const crates: VibeCrate[] = []
  const meta = new Map(getSupportedVibes().map((v) => [v.id, v]))

  for (const [vibeId, seedIds] of Object.entries(VIBE_SEEDS)) {
    const seedRecs = await Promise.all(seedIds.map(recommendationsForSeed))
    const baseRecs = uniqById(seedRecs.flat())
    const baseEnriched = await enrichBatch(baseRecs)
    allCandidates.push(...baseEnriched)

    const baseRanked = baseEnriched
      .map((candidate) => {
        const profile = scoreShowVibes(candidate)
        const hit = profile.vibes.find((v) => v.vibeId === vibeId)
        return hit
          ? {
              id: candidate.id,
              title: candidate.title,
              score: hit.score,
              evidence: hit.evidence,
              popularity: candidate.popularity ?? 0,
            }
          : null
      })
      .filter(
        (
          x,
        ): x is {
          id: number
          title: string
          score: number
          evidence: string[]
          popularity: number
        } => !!x,
      )
      .sort((a, b) => (b.score === a.score ? b.popularity - a.popularity : b.score - a.score))

    // Expansion step: take best matches and crawl one extra "more like this" hop.
    const expansionSourceIds = baseRanked
      .filter((x) => x.score >= minScore - 0.08)
      .slice(0, expansionSeedsPerCrate)
      .map((x) => x.id)
    const expansionRecs = await Promise.all(expansionSourceIds.map((id) => recommendationsForSeed(id)))
    const expandedEnriched = await enrichBatch(uniqById(expansionRecs.flat()))
    allCandidates.push(...expandedEnriched)

    const combinedMap = new Map<number, VibeCandidate>()
    for (const c of baseEnriched) combinedMap.set(c.id, c)
    for (const c of expandedEnriched) combinedMap.set(c.id, c)
    const combinedEnriched = Array.from(combinedMap.values())

    const rankedPool = combinedEnriched
      .map((candidate) => {
        const profile = scoreShowVibes(candidate)
        const hit = profile.vibes.find((v) => v.vibeId === vibeId)
        return hit
          ? {
              id: candidate.id,
              title: candidate.title,
              score: hit.score,
              evidence: hit.evidence,
              popularity: candidate.popularity ?? 0,
            }
          : null
      })
      .filter(
        (
          x,
        ): x is {
          id: number
          title: string
          score: number
          evidence: string[]
          popularity: number
        } => !!x,
      )
      .filter((x) => x.score >= minScore)
      .sort((a, b) => (b.score === a.score ? b.popularity - a.popularity : b.score - a.score))

    const totalMatches = rankedPool.length
    const start = (page - 1) * pageSize
    const ranked = rankedPool.slice(start, start + Math.min(maxPerCrate, pageSize))

    if (ranked.length > 0) {
      const v = meta.get(vibeId)
      crates.push({
        vibeId,
        vibeTitle: v?.title ?? vibeId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        subtitle: v?.subtitle ?? `Seeded from TMDB recommendation graph (${seedIds.length} anchors).`,
        shows: ranked.map((r) => ({
          id: r.id,
          title: r.title,
          score: r.score,
          evidence: r.evidence,
        })),
        totalMatches,
        page,
        pageSize,
        hasMore: start + Math.min(maxPerCrate, pageSize) < totalMatches,
      })
    }
  }

  const uniqueCandidates = Array.from(new Map(allCandidates.map((c) => [c.id, c])).values())
  return { candidates: uniqueCandidates, crates }
}
