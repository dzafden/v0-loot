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
  family_trauma: [85552, 1396, 1416],
  enemies_to_lovers_tension: [1399, 71712, 71912],
  peak_2010s_nostalgia: [66732, 71912, 69050],
  competence_porn: [19885, 1408, 60735],
  cozy_autumn_background_noise: [4589, 1668, 2316],
  found_family: [66732, 46261, 60625],
  mystery_solving_loop: [1419, 4057, 4614],
  toxic_but_stylish: [85552, 62611, 119051],
  crime_empire_rise_fall: [1396, 1398, 42009],
  political_mind_games: [44217, 57243, 2734],
  courtroom_showdowns: [2288, 1431, 2734],
  workplace_chaos_comedy: [2316, 1668, 4573],
  apocalypse_survival: [1402, 71912, 110316],
  mind_bending_scifi: [66732, 63174, 70523],
  comfort_rewatch_classics: [1668, 2316, 1434],
  teen_identity_drama: [69050, 85844, 71712],
  wholesome_animation: [60625, 65930, 45789],
  dark_detective_noir: [46648, 1408, 44264],
  historical_palace_intrigue: [1399, 87108, 93740],
  heist_masterplan: [60574, 80040, 1396],
  prestige_slow_burn: [1396, 44217, 456],
  monster_of_the_week: [1622, 4604, 57243],
  relationship_messy_ensemble: [1416, 71712, 62852],
  underdog_sports_spirit: [42705, 94605, 65820],
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
